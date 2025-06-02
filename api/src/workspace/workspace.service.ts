import { Inject, Injectable } from "@nestjs/common";
import { CreateWorkspaceDto, UpdateWorkspaceDto } from "./workspace.dto";
import { WorkspaceListResponse } from "contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { SubspaceService } from "@/subspace/subspace.service";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";

@Injectable()
export class WorkspaceService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prismaService: ExtendedPrismaClient,
    private readonly subspaceService: SubspaceService,
  ) {}

  async initializeWorkspace(dto: CreateWorkspaceDto, userId: number) {
    const workspace = await this.createWorkspace(dto, userId);
    await this.setCurrentWorkspace(userId, workspace.id);
    await this.subspaceService.createDefaultGlobalSubspace(userId, workspace.id);
    // TODO: other stuffs
    return { workspace };
  }

  async createWorkspace(dto: CreateWorkspaceDto, userId: number) {
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

    return {
      ...workspace,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }

  async CreateDefaultWorkspace(userId: number) {
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

    await this.setCurrentWorkspace(userId, workspace.id);

    return workspace;
  }

  async getUserWorkspaces(currentUserId: number): Promise<WorkspaceListResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: currentUserId },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    const workspaces = await this.prismaService.workspace.findMany({
      where: {
        members: {
          some: {
            userId: currentUserId,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (workspaces.length === 0) {
      // Create a default workspace when there is none for backwards compatibility
      const workspace = await this.CreateDefaultWorkspace(currentUserId);
      return [workspace];
    }

    return workspaces;
  }

  // async getCurrentWorkspace(userId: number) {
  //   const user = await this.prismaService.user.findUnique({
  //     where: { id: userId },
  //     include: { currentWorkspace: true },
  //   });

  //   if (!user || !user.currentWorkspaceId) {
  //     const firstWorkspace = await this.prismaService.workspace.findFirst({
  //       where: {
  //         members: {
  //           some: {
  //             userId,
  //           },
  //         },
  //       },
  //     });

  //     if (firstWorkspace) {
  //       await this.setCurrentWorkspace(userId, firstWorkspace.id);
  //       return {
  //         ...firstWorkspace,
  //         createdAt: firstWorkspace.createdAt.toISOString(),
  //         updatedAt: firstWorkspace.updatedAt.toISOString(),
  //       };
  //     }

  //     return null;
  //   }

  //   if (user.currentWorkspace) {
  //     return {
  //       ...user.currentWorkspace,
  //       createdAt: user.currentWorkspace.createdAt.toISOString(),
  //       updatedAt: user.currentWorkspace.updatedAt.toISOString(),
  //     };
  //   }

  //   // Fallback if currentWorkspace is null but currentWorkspaceId exists
  //   const workspace = await this.prismaService.workspace.findUnique({
  //     where: { id: user.currentWorkspaceId },
  //   });

  //   if (!workspace) {
  //     return null;
  //   }

  //   return {
  //     ...workspace,
  //     createdAt: workspace.createdAt.toISOString(),
  //     updatedAt: workspace.updatedAt.toISOString(),
  //   };
  // }

  async updateWorkspace(id: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.prismaService.workspace.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });

    return {
      ...workspace,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }

  async deleteWorkspace(id: string) {
    await this.prismaService.workspace.delete({ where: { id } });
    return { success: true };
  }

  async addWorkspaceMember(workspaceId: string, userId: number) {
    await this.prismaService.workspaceMember.create({
      data: {
        workspaceId,
        userId,
      },
    });
    return { success: true };
  }

  async removeWorkspaceMember(workspaceId: string, userId: number) {
    await this.prismaService.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });
  }

  async hasWorkspaceAccess(userId: number, workspaceId: string): Promise<boolean> {
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
}
