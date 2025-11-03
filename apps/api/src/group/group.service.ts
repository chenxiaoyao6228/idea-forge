import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { CreateGroupDto, UpdateGroupDto, GroupListRequestDto, AddGroupUserDto, RemoveGroupUserDto } from "./group.dto";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { presentGroup } from "./group.presenter";

@Injectable()
export class GroupService {
  constructor(private readonly prismaService: PrismaService) {}

  async getGroupInfo(userId: string, dto: { id: string }) {
    const group = await this.prismaService.memberGroup.findUnique({
      where: { id: dto.id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!group) {
      throw new ApiException(ErrorCodeEnum.GroupNotFound);
    }

    return presentGroup(group);
  }

  async listGroups(userId: string, dto: GroupListRequestDto) {
    const { page = 1, limit = 10, query, workspaceId, sortBy = "createdAt", sortOrder = "desc" } = dto;
    const where: Prisma.MemberGroupWhereInput = {
      ...(workspaceId ? { workspaceId } : {}),
      ...(query
        ? {
            OR: [{ name: { contains: query, mode: Prisma.QueryMode.insensitive } }, { description: { contains: query, mode: Prisma.QueryMode.insensitive } }],
          }
        : {}),
    };

    const { data, pagination } = await (this.prismaService.memberGroup as any).paginateWithApiFormat({
      where,
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
      orderBy: [{ [sortBy]: sortOrder }, { name: "asc" }],
      page,
      limit,
    });

    return {
      pagination,
      data: data.map(presentGroup),
      abilities: {},
    };
  }

  async createGroup(userId: string, dto: CreateGroupDto) {
    const group = await this.prismaService.memberGroup.create({
      data: {
        ...dto,
        members: {
          create: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return presentGroup(group);
  }

  async updateGroup(userId: string, dto: UpdateGroupDto) {
    const group = await this.prismaService.memberGroup.update({
      where: { id: dto.id },
      data: {
        name: dto.name,
        description: dto.description,
        validUntil: dto.validUntil,
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return presentGroup(group);
  }

  async deleteGroup(userId: string, dto: { id: string }) {
    // Transaction to ensure atomicity:
    // 1. Delete all GROUP permissions granted by this group (using sourceGroupId)
    // 2. Delete group memberships
    // 3. Delete the group
    await this.prismaService.$transaction(async (tx) => {
      // Delete all GROUP permissions granted by this specific group
      // This is more precise than deleting all GROUP permissions for all members
      await tx.documentPermission.deleteMany({
        where: {
          sourceGroupId: dto.id,
          inheritedFromType: "GROUP",
        },
      });

      // Delete all group memberships
      await tx.memberGroupUser.deleteMany({
        where: { groupId: dto.id },
      });

      // Delete the group itself
      await tx.memberGroup.delete({
        where: { id: dto.id },
      });
    });

    return { success: true };
  }

  async addUserToGroup(userId: string, dto: AddGroupUserDto) {
    // Check if user is already a member
    const existing = await this.prismaService.memberGroupUser.findUnique({
      where: {
        groupId_userId: {
          groupId: dto.id,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      const group = await this.prismaService.memberGroup.findUnique({
        where: { id: dto.id },
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      });
      return presentGroup(group!);
    }

    // Add user if not already a member
    const group = await this.prismaService.memberGroup.update({
      where: { id: dto.id },
      data: {
        members: {
          create: {
            userId: dto.userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    return presentGroup(group);
  }

  async removeUserFromGroup(userId: string, dto: RemoveGroupUserDto) {
    // Transaction to ensure atomicity:
    // 1. Delete group membership
    // 2. Delete all GROUP permissions for this user
    await this.prismaService.$transaction(async (tx) => {
      // Delete the member from group
      await tx.memberGroupUser.deleteMany({
        where: {
          AND: [{ userId: dto.userId }, { groupId: dto.id }],
        },
      });

      // Delete GROUP permissions granted by this specific group for this user
      // This preserves GROUP permissions from other groups the user might be in
      await tx.documentPermission.deleteMany({
        where: {
          userId: dto.userId,
          sourceGroupId: dto.id,
          inheritedFromType: "GROUP",
        },
      });
    });

    // Get the updated group
    const group = await this.prismaService.memberGroup.findUnique({
      where: { id: dto.id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!group) {
      throw new ApiException(ErrorCodeEnum.GroupNotFound);
    }

    return presentGroup(group);
  }
}
