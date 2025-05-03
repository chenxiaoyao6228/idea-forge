import { Injectable } from "@nestjs/common";
import { PrismaService } from "../_shared/database/prisma/prisma.service";
import { CreateSubspaceDto, UpdateSubspaceDto, AddSubspaceMemberDto, UpdateSubspaceMemberDto } from "./subspace.dto";
import { ErrorCodeEnum, SubspaceMemberListResponse, SubspaceType } from "contracts";
import { ApiException } from "@/_shared/exceptions/api.exception";

@Injectable()
export class SubspaceService {
  constructor(private readonly prismaService: PrismaService) {}

  async createDefaultGlobalSubspace(userId: number, workspaceId: string) {
    return await this.createSubspace(
      {
        workspaceId,
        name: "Global Space",
        description: "Global subspace",
        avatar: "",
        type: SubspaceType.WORKSPACE_WIDE,
      },
      userId,
    );
  }

  async createSubspace(dto: CreateSubspaceDto, userId: number) {
    // Check if user is a member of the workspace
    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: dto.workspaceId,
          userId,
        },
      },
    });

    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.WorkspaceNotFoundOrNotInWorkspace);
    }

    const subspace = await this.prismaService.subspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        type: dto.type,
        workspace: {
          connect: {
            id: dto.workspaceId,
          },
        },
        members: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });

    return {
      ...subspace,
      createdAt: subspace.createdAt.toISOString(),
      updatedAt: subspace.updatedAt.toISOString(),
    };
  }

  async getSubspace(id: string, userId: number) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id },
      include: {
        members: true,
        workspace: {
          include: {
            members: {
              where: {
                userId,
              },
            },
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    // Check if user has access to this subspace
    const isWorkspaceMember = subspace.workspace.members.length > 0;
    const isSubspaceMember = subspace.members.some((member) => member.userId === userId);
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isWorkspaceMember || (!isSubspaceMember && !isPublicSubspace)) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    return {
      subspace: {
        ...subspace,
        workspace: undefined,
        members: subspace.members.map((member) => ({
          ...member,
          createdAt: member.createdAt.toISOString(),
        })),
        createdAt: subspace.createdAt.toISOString(),
        updatedAt: subspace.updatedAt.toISOString(),
      },
    };
  }

  async updateSubspace(id: string, dto: UpdateSubspaceDto, userId: number) {
    // Check if user is an admin of the subspace
    const subspaceMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId: id,
        userId,
        role: "ADMIN",
      },
    });

    if (!subspaceMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    const subspace = await this.prismaService.subspace.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        avatar: dto.avatar,
        type: dto.type,
      },
    });

    return {
      ...subspace,
      createdAt: subspace.createdAt.toISOString(),
      updatedAt: subspace.updatedAt.toISOString(),
    };
  }

  async deleteSubspace(id: string, userId: number) {
    // Check if user is an admin of the subspace
    const subspaceMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId: id,
        userId,
        role: "ADMIN",
      },
    });

    if (!subspaceMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    await this.prismaService.subspace.delete({ where: { id } });
    return { success: true };
  }

  async addSubspaceMember(subspaceId: string, dto: AddSubspaceMemberDto, currentUserId: number) {
    // Check if current user is an admin of the subspace
    const currentUserMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId,
        userId: currentUserId,
        role: "ADMIN",
      },
    });

    if (!currentUserMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    // Check if the user to be added is a member of the workspace
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      select: { workspaceId: true },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    const workspaceMember = await this.prismaService.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: subspace.workspaceId,
          userId: dto.userId,
        },
      },
    });

    if (!workspaceMember) {
      throw new ApiException(ErrorCodeEnum.UserNotInWorkspace);
    }

    // Check if the user is already a member of the subspace
    const existingMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId,
        userId: dto.userId,
      },
    });

    if (existingMember) {
      throw new ApiException(ErrorCodeEnum.UserAlreadyInSubspace);
    }

    const member = await this.prismaService.subspaceMember.create({
      data: {
        subspaceId,
        userId: dto.userId,
        role: dto.role,
      },
    });

    return {
      member: {
        ...member,
        createdAt: member.createdAt.toISOString(),
      },
    };
  }

  async updateSubspaceMember(subspaceId: string, memberId: string, dto: UpdateSubspaceMemberDto, currentUserId: number) {
    // Check if current user is an admin of the subspace
    const currentUserMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId,
        userId: currentUserId,
        role: "ADMIN",
      },
    });

    if (!currentUserMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    const member = await this.prismaService.subspaceMember.update({
      where: { id: memberId },
      data: {
        role: dto.role,
      },
    });

    return {
      member: {
        ...member,
        createdAt: member.createdAt.toISOString(),
      },
    };
  }

  async removeSubspaceMember(subspaceId: string, memberId: string, currentUserId: number) {
    // Check if current user is an admin of the subspace
    const currentUserMember = await this.prismaService.subspaceMember.findFirst({
      where: {
        subspaceId,
        userId: currentUserId,
        role: "ADMIN",
      },
    });

    if (!currentUserMember) {
      throw new ApiException(ErrorCodeEnum.SubspaceAdminRoleRequired);
    }

    await this.prismaService.subspaceMember.delete({
      where: { id: memberId },
    });

    return { success: true };
  }

  async getSubspaceMembers(subspaceId: string, userId: number): Promise<SubspaceMemberListResponse> {
    // Check if user has access to this subspace
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
      include: {
        members: {
          where: {
            userId,
          },
        },
      },
    });

    if (!subspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    const isSubspaceMember = subspace.members.length > 0;
    const isPublicSubspace = subspace.type === "PUBLIC";

    if (!isSubspaceMember && !isPublicSubspace) {
      throw new ApiException(ErrorCodeEnum.SubspaceAccessDenied);
    }

    const members = await this.prismaService.subspaceMember.findMany({
      where: { subspaceId },
    });

    return {
      members: members.map((member) => ({
        ...member,
        createdAt: member.createdAt.toISOString(),
      })),
      total: members.length,
    };
  }
}
