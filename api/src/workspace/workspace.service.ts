import { Inject, Injectable } from "@nestjs/common";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto";
import { WorkspaceListResponse } from "contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { SubspaceService } from "@/subspace/subspace.service";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { presentWorkspace, presentWorkspaces } from "./workspace.presenter";
import fractionalIndex from "fractional-index";

@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prismaService: ExtendedPrismaClient,
    private readonly subspaceService: SubspaceService,
  ) {}

  async initializeWorkspace(dto: CreateWorkspaceDto, userId: string) {
    const workspace = await this.createWorkspace(dto, userId);
    await this.subspaceService.createDefaultGlobalSubspace(userId, workspace.id);
    // TODO: other stuffs
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
            role: "OWNER",
          },
        },
      },
    });

    return presentWorkspace(workspace);
  }

  async CreateDefaultWorkspace(userId: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    const workspace = await this.prismaService.workspace.create({
      data: {
        name: user.email + "'s Workspace",
        description: "default workspace for user",
        members: {
          create: {
            userId: userId,
            role: "OWNER",
          },
        },
      },
    });

    return presentWorkspace(workspace);
  }

  async getUserWorkspaces(currentuserId: string): Promise<WorkspaceListResponse> {
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
      // Create a default workspace when there is none for backwards compatibility
      const workspace = await this.CreateDefaultWorkspace(currentUserId);
      return [workspace];
    }

    // Map to workspaces, maintaining the order from the query
    const workspaces = user.workspaceMembers.map((member) => member.workspace);
    return presentWorkspaces(workspaces);
  }

  async updateWorkspace(id: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.prismaService.workspace.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });

    return presentWorkspace(workspace);
  }

  async deleteWorkspace(id: string) {
    await this.prismaService.workspace.delete({ where: { id } });
    return { success: true };
  }

  async addWorkspaceMember(workspaceId: string, userId: string) {
    await this.prismaService.workspaceMember.create({
      data: {
        workspaceId,
        userId,
      },
    });
    return { success: true };
  }

  async removeWorkspaceMember(workspaceId: string, userId: string) {
    await this.prismaService.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
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
}
