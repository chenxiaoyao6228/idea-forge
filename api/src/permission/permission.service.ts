import { Inject, Injectable } from "@nestjs/common";
import { PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { ExtendedPrismaClient } from "@/_shared/database/prisma/prisma.extension";
import { ResourceType, PermissionLevel, UnifiedPermission, WorkspaceRole, SubspaceRole, SourceType, SubspaceType, GuestStatus } from "@prisma/client";

@Injectable()
export class PermissionService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  // 获取用户所有权限
  async getUserAllPermissions(userId: string): Promise<UnifiedPermission[]> {
    // 获取按优先级排序的权限
    const userPermissions = await this.prisma.unifiedPermission.findMany({
      where: { userId },
      orderBy: { priority: "asc" },
    });

    const resourcePermissions = new Map<string, UnifiedPermission>();

    // 由于权限已按优先级排序，后面的权限会覆盖前面的权限
    for (const perm of userPermissions) {
      if (perm.resourceType === ResourceType.DOCUMENT) {
        resourcePermissions.set(perm.resourceId, perm);
      }
    }
    return [...resourcePermissions.values()];
  }

  // 增强：支持 Guest 权限和优先级解析
  async resolveUserPermission(userId: string, resourceType: ResourceType, resourceId: string, guestId?: string): Promise<PermissionLevel> {
    const permissions = await this.prisma.unifiedPermission.findMany({
      where: {
        OR: [
          { userId, resourceType, resourceId },
          { guestId, resourceType, resourceId },
        ],
      },
      orderBy: { priority: "asc" },
    });

    return this.applyPermissionPriority(permissions);
  }

  // 权限优先级解析
  private applyPermissionPriority(permissions: UnifiedPermission[]): PermissionLevel {
    if (permissions.length === 0) return PermissionLevel.NONE;

    // 按优先级排序，数字越小优先级越高
    const sortedPermissions = permissions.sort((a, b) => a.priority - b.priority);

    // 返回最高优先级的权限
    return sortedPermissions[0].permission;
  }

  // 分配工作空间权限
  async assignWorkspacePermissions(userId: string, workspaceId: string, role: WorkspaceRole, createdById: string) {
    const permission = this.mapWorkspaceRoleToPermission(role);
    const sourceType = this.mapWorkspaceRoleToSourceType(role);
    const priority = this.getPriorityBySourceType(sourceType);

    return await this.prisma.unifiedPermission.upsert({
      where: {
        userId_guestId_resourceType_resourceId_sourceType: {
          userId,
          guestId: "",
          resourceType: ResourceType.WORKSPACE,
          resourceId: workspaceId,
          sourceType,
        },
      },
      create: {
        userId,
        resourceType: ResourceType.WORKSPACE,
        resourceId: workspaceId,
        permission,
        sourceType,
        priority,
        createdById,
      },
      update: { permission },
    });
  }

  // 分配子空间权限
  async assignSubspacePermissions(userId: string, subspaceId: string, role: SubspaceRole, createdById: string) {
    const permission = this.mapSubspaceRoleToPermission(role);
    const sourceType = this.mapSubspaceRoleToSourceType(role);
    const priority = this.getPriorityBySourceType(sourceType);

    return await this.prisma.unifiedPermission.upsert({
      where: {
        userId_guestId_resourceType_resourceId_sourceType: {
          userId,
          guestId: "",
          resourceType: ResourceType.SUBSPACE,
          resourceId: subspaceId,
          sourceType,
        },
      },
      create: {
        userId,
        resourceType: ResourceType.SUBSPACE,
        resourceId: subspaceId,
        permission,
        sourceType,
        priority,
        createdById,
      },
      update: { permission },
    });
  }

  // 分配文档权限
  async assignDocumentPermission(userId: string, docId: string, permission: PermissionLevel, createdById: string, sourceType: SourceType = SourceType.DIRECT) {
    const priority = this.getPriorityBySourceType(sourceType);

    return await this.prisma.unifiedPermission.upsert({
      where: {
        userId_guestId_resourceType_resourceId_sourceType: {
          userId,
          guestId: "",
          resourceType: ResourceType.DOCUMENT,
          resourceId: docId,
          sourceType,
        },
      },
      create: {
        userId,
        resourceType: ResourceType.DOCUMENT,
        resourceId: docId,
        permission,
        sourceType,
        priority,
        createdById,
      },
      update: { permission },
    });
  }

  // 支持成员组权限分配
  async assignGroupPermissions(groupId: string, resourceType: ResourceType, resourceId: string, permission: PermissionLevel, createdById: string) {
    const groupMembers = await this.prisma.memberGroupUser.findMany({
      where: { groupId },
      include: { user: true },
    });

    const permissions: UnifiedPermission[] = [];

    for (const member of groupMembers) {
      const groupPermission = await this.prisma.unifiedPermission.create({
        data: {
          userId: member.userId,
          resourceType,
          resourceId,
          permission,
          sourceType: SourceType.GROUP,
          priority: 2,
          createdById,
        },
      });

      permissions.push(groupPermission);
    }

    return permissions;
  }

  // 邀请协作访客
  async inviteGuestCollaborator(docId: string, email: string, permission: PermissionLevel, inviterId: string, expireDays = 30) {
    // 获取文档所属工作空间
    const doc = await this.prisma.doc.findUnique({
      where: { id: docId },
      select: { workspaceId: true },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    // 创建或更新访客
    const guest = await this.prisma.guestCollaborator.upsert({
      where: {
        email_workspaceId: {
          email,
          workspaceId: doc.workspaceId,
        },
      },
      create: {
        email,
        workspaceId: doc.workspaceId,
        invitedById: inviterId,
        expireAt: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
        status: GuestStatus.PENDING,
      },
      update: {
        expireAt: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
        status: GuestStatus.ACTIVE,
      },
    });

    // 创建访客权限
    const guestPermission = await this.prisma.unifiedPermission.create({
      data: {
        guestId: guest.id,
        resourceType: ResourceType.DOCUMENT,
        resourceId: docId,
        permission,
        sourceType: SourceType.GUEST,
        priority: 7,
        createdById: inviterId,
      },
    });

    return { guest, permission: guestPermission };
  }

  // 根据子空间类型分配初始权限
  async assignSubspaceTypePermissions(subspaceId: string, subspaceType: SubspaceType, workspaceId: string, creatorId: string) {
    switch (subspaceType) {
      case SubspaceType.WORKSPACE_WIDE:
        await this.assignWorkspaceWideSubspacePermissions(subspaceId, workspaceId, creatorId);
        break;
      case SubspaceType.PUBLIC:
        await this.assignPublicSubspacePermissions(subspaceId, workspaceId, creatorId);
        break;
      case SubspaceType.INVITE_ONLY:
        await this.assignInviteOnlySubspacePermissions(subspaceId, creatorId);
        break;
      case SubspaceType.PRIVATE:
        await this.assignPrivateSubspacePermissions(subspaceId, creatorId);
        break;
    }
  }

  // 全员空间权限分配
  private async assignWorkspaceWideSubspacePermissions(subspaceId: string, workspaceId: string, creatorId: string) {
    const workspaceMembers = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
    });

    for (const member of workspaceMembers) {
      const role = member.userId === creatorId ? SubspaceRole.ADMIN : SubspaceRole.MEMBER;
      await this.assignSubspacePermissions(member.userId, subspaceId, role, creatorId);
    }
  }

  // 公开空间权限分配
  private async assignPublicSubspacePermissions(subspaceId: string, workspaceId: string, creatorId: string) {
    // 创建者为管理员
    await this.assignSubspacePermissions(creatorId, subspaceId, SubspaceRole.ADMIN, creatorId);

    // 其他工作空间成员可以评论
    const workspaceMembers = await this.prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        userId: { not: creatorId },
      },
    });

    for (const member of workspaceMembers) {
      await this.prisma.unifiedPermission.create({
        data: {
          userId: member.userId,
          resourceType: ResourceType.SUBSPACE,
          resourceId: subspaceId,
          permission: PermissionLevel.COMMENT,
          sourceType: SourceType.WORKSPACE_MEMBER,
          priority: 6,
          createdById: creatorId,
        },
      });
    }
  }

  // 邀请空间权限分配
  private async assignInviteOnlySubspacePermissions(subspaceId: string, creatorId: string) {
    // 只有创建者有权限
    await this.assignSubspacePermissions(creatorId, subspaceId, SubspaceRole.ADMIN, creatorId);
  }

  // 私有空间权限分配
  private async assignPrivateSubspacePermissions(subspaceId: string, creatorId: string) {
    // 只有创建者有权限
    await this.assignSubspacePermissions(creatorId, subspaceId, SubspaceRole.ADMIN, creatorId);
  }

  // 移除权限
  async removePermission(permissionId: string) {
    return await this.prisma.unifiedPermission.delete({
      where: { id: permissionId },
    });
  }

  // 更新权限
  async updatePermission(permissionId: string, newPermission: PermissionLevel) {
    return await this.prisma.unifiedPermission.update({
      where: { id: permissionId },
      data: { permission: newPermission },
    });
  }

  // 辅助方法：角色到权限映射
  private mapWorkspaceRoleToPermission(role: WorkspaceRole): PermissionLevel {
    switch (role) {
      case WorkspaceRole.OWNER:
        return PermissionLevel.OWNER;
      case WorkspaceRole.ADMIN:
        return PermissionLevel.MANAGE;
      case WorkspaceRole.MEMBER:
        return PermissionLevel.READ;
      default:
        return PermissionLevel.NONE;
    }
  }

  private mapSubspaceRoleToPermission(role: SubspaceRole): PermissionLevel {
    switch (role) {
      case SubspaceRole.ADMIN:
        return PermissionLevel.MANAGE;
      case SubspaceRole.MEMBER:
        return PermissionLevel.EDIT;
      default:
        return PermissionLevel.NONE;
    }
  }

  private mapWorkspaceRoleToSourceType(role: WorkspaceRole): SourceType {
    return role === WorkspaceRole.MEMBER ? SourceType.WORKSPACE_MEMBER : SourceType.WORKSPACE_ADMIN;
  }

  private mapSubspaceRoleToSourceType(role: SubspaceRole): SourceType {
    return role === SubspaceRole.MEMBER ? SourceType.SUBSPACE_MEMBER : SourceType.SUBSPACE_ADMIN;
  }

  // 获取源类型对应的优先级
  getPriorityBySourceType(sourceType: SourceType): number {
    switch (sourceType) {
      case SourceType.DIRECT:
        return 1;
      case SourceType.GROUP:
        return 2;
      case SourceType.SUBSPACE_ADMIN:
        return 3;
      case SourceType.SUBSPACE_MEMBER:
        return 4;
      case SourceType.WORKSPACE_ADMIN:
        return 5;
      case SourceType.WORKSPACE_MEMBER:
        return 6;
      case SourceType.GUEST:
        return 7;
      default:
        return 999;
    }
  }
}
