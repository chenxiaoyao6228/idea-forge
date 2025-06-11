import { Inject, Injectable } from "@nestjs/common";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto";
import { WorkspaceListResponse } from "contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { SubspaceService } from "@/subspace/subspace.service";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { presentWorkspace, presentWorkspaces } from "./workspace.presenter";
import fractionalIndex from "fractional-index";
import { ResourceType, WorkspaceRole } from "@prisma/client";
import { PermissionInheritanceService } from "@/permission/permission-inheritance.service";
import { PermissionService } from "@/permission/permission.service";

@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prismaService: ExtendedPrismaClient,
    private readonly subspaceService: SubspaceService,
    private readonly permissionService: PermissionService,
    private readonly inheritanceService: PermissionInheritanceService,
  ) {}

  async initializeWorkspace(dto: CreateWorkspaceDto, userId: string) {
    const workspace = await this.createWorkspace(dto, userId);
    await this.subspaceService.createDefaultGlobalSubspace(userId, workspace.id);
    return { workspace };
  }

  async createWorkspace(dto: CreateWorkspaceDto, userId: string) {
    const workspace = await this.prismaService.workspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        members: {
          create: {
            userId: userId,
            role: WorkspaceRole.OWNER,
          },
        },
      },
    });

    // assign workspace permissions to creator
    await this.permissionService.assignWorkspacePermissions(userId, workspace.id, WorkspaceRole.OWNER, userId);

    return presentWorkspace(workspace);
  }

  async CreateDefaultWorkspace(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    return this.createWorkspace(
      {
        name: user.email + "'s Workspace",
        description: "default workspace for user",
        avatar: "",
        settings: {},
      },
      userId,
    );
  }

  async getUserWorkspaces(currentUserId: string): Promise<WorkspaceListResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: currentUserId },
      include: {
        workspaceMembers: {
          include: {
            workspace: true,
          },
          orderBy: [{ index: "asc" }, { createdAt: "desc" }],
        },
      },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    if (user.workspaceMembers.length === 0) {
      const workspace = await this.CreateDefaultWorkspace(currentUserId);
      return [workspace];
    }

    const workspaces = user.workspaceMembers.map((member) => member.workspace);
    return presentWorkspaces(workspaces);
  }

  async getWorkspace(workspaceId: string, userId: string) {
    const workspace = await this.prismaService.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, displayName: true, imageUrl: true },
            },
          },
        },
        subspaces: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { docs: true, members: true },
        },
      },
    });

    if (!workspace) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    // 验证用户是否有访问权限
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    return presentWorkspace(workspace);
  }

  async getWorkspaceMembers(workspaceId: string, userId: string) {
    // 验证用户是否有访问权限
    const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    const members = await this.prismaService.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, imageUrl: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return members;
  }

  private async getWorkspaceSubspaceIds(workspaceId: string): Promise<string[]> {
    const subspaces = await this.prismaService.subspace.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    return subspaces.map((s) => s.id);
  }

  private async getWorkspaceDocumentIds(workspaceId: string): Promise<string[]> {
    const docs = await this.prismaService.doc.findMany({
      where: { workspaceId },
      select: { id: true },
    });
    return docs.map((d) => d.id);
  }

  async updateWorkspace(id: string, dto: UpdateWorkspaceDto, userId: string) {
    // 验证用户是否有更新权限
    const hasAccess = await this.hasWorkspaceAccess(userId, id);
    if (!hasAccess) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    const workspace = await this.prismaService.workspace.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        settings: dto.settings,
      },
    });

    return presentWorkspace(workspace);
  }

  async deleteWorkspace(id: string, userId: string) {
    // 验证用户是否是 OWNER
    const member = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });

    if (!member || member.role !== WorkspaceRole.OWNER) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // 检查是否还有其他成员
    const memberCount = await this.prismaService.workspaceMember.count({
      where: { workspaceId: id },
    });

    if (memberCount > 1) {
      throw new ApiException(ErrorCodeEnum.WorkspaceHasMembers);
    }

    // 删除所有相关权限
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        OR: [
          { resourceType: ResourceType.WORKSPACE, resourceId: id },
          { resourceType: ResourceType.SUBSPACE, resourceId: { in: await this.getWorkspaceSubspaceIds(id) } },
          { resourceType: ResourceType.DOCUMENT, resourceId: { in: await this.getWorkspaceDocumentIds(id) } },
        ],
      },
    });

    await this.prismaService.workspace.delete({ where: { id } });
    return { success: true };
  }

  async addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole, adminId: string) {
    // 验证用户是否已经是成员
    const existingMember = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (existingMember) {
      throw new ApiException(ErrorCodeEnum.UserAlreadyInWorkspace);
    }

    // 验证被添加的用户是否存在
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    // 1. 创建工作空间成员
    const member = await this.prismaService.workspaceMember.create({
      data: { workspaceId, userId, role },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, imageUrl: true },
        },
      },
    });

    // 2. 分配工作空间权限
    const permission = await this.permissionService.assignWorkspacePermissions(userId, workspaceId, role, adminId);

    // 3. 传播权限到所有子空间和文档
    await this.inheritanceService.propagatePermissions(ResourceType.WORKSPACE, workspaceId, permission);

    return member;
  }

  async removeWorkspaceMember(workspaceId: string, userId: string, adminId: string) {
    // 验证成员是否存在
    const member = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    // 不能移除最后一个 OWNER
    if (member.role === WorkspaceRole.OWNER) {
      const ownerCount = await this.prismaService.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new ApiException(ErrorCodeEnum.CannotRemoveLastOwner);
      }
    }

    // 1. 删除成员关系
    await this.prismaService.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    // 2. 清理所有相关权限
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        userId,
        OR: [
          { resourceType: ResourceType.WORKSPACE, resourceId: workspaceId },
          { resourceType: ResourceType.SUBSPACE, resourceId: { in: await this.getWorkspaceSubspaceIds(workspaceId) } },
          { resourceType: ResourceType.DOCUMENT, resourceId: { in: await this.getWorkspaceDocumentIds(workspaceId) } },
        ],
      },
    });

    return { success: true };
  }

  async hasWorkspaceAccess(userId: string, workspaceId: string): Promise<boolean> {
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    return !!workspaceMember;
  }

  async reorderWorkspaces(workspaceIds: string[], userId: string) {
    // Verify user has access to all workspaces
    for (const workspaceId of workspaceIds) {
      const hasAccess = await this.hasWorkspaceAccess(userId, workspaceId);
      if (!hasAccess) {
        throw new ApiException(ErrorCodeEnum.AuthenticationFailed);
      }
    }

    // Get current workspace members with their indices
    const workspaceMembers = await this.prismaService.workspaceMember.findMany({
      where: {
        userId,
        workspaceId: {
          in: workspaceIds,
        },
      },
      orderBy: { index: "asc" },
    });

    // Update indices using fractional indexing
    const updates = [];
    let lastIndex: string | null = null;

    for (const workspaceId of workspaceIds) {
      const member = workspaceMembers.find((m) => m.workspaceId === workspaceId);
      if (member) {
        const newIndex = fractionalIndex(lastIndex, null);
        updates.push(
          this.prismaService.workspaceMember.update({
            where: { id: member.id },
            data: { index: newIndex },
          }),
        );
        lastIndex = newIndex;
      }
    }

    // Apply all updates in parallel
    await Promise.all(updates);

    return { success: true };
  }

  async updateWorkspaceMemberRole(workspaceId: string, userId: string, newRole: WorkspaceRole, adminId: string) {
    // 验证成员是否存在
    const member = await this.prismaService.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });

    if (!member) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    // 如果是降级最后一个 OWNER，需要检查
    if (member.role === WorkspaceRole.OWNER && newRole !== WorkspaceRole.OWNER) {
      const ownerCount = await this.prismaService.workspaceMember.count({
        where: { workspaceId, role: WorkspaceRole.OWNER },
      });

      if (ownerCount <= 1) {
        throw new ApiException(ErrorCodeEnum.CannotRemoveLastOwner);
      }
    }

    // 1. 更新成员角色
    const updatedMember = await this.prismaService.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, imageUrl: true },
        },
      },
    });

    // 2. 更新统一权限
    await this.permissionService.assignWorkspacePermissions(userId, workspaceId, newRole, adminId);

    return updatedMember;
  }
}
