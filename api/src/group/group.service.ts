import { Injectable, Inject } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { GroupPresenter } from "./group.presenter";
import { CreateGroupDto, UpdateGroupDto, GroupInfoDto, GroupListRequestDto, AddGroupUserDto, RemoveGroupUserDto } from "./group.dto";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";

@Injectable()
export class GroupService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly groupPresenter: GroupPresenter,
  ) {}

  async getGroupInfo(userId: string, dto: GroupInfoDto) {
    const group = await this.prisma.memberGroup.findUnique({
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

    return this.groupPresenter.presentGroupInfo(group);
  }

  async listGroups(userId: string, dto: GroupListRequestDto) {
    const where: Prisma.MemberGroupWhereInput = {
      ...(dto.workspaceId ? { workspaceId: dto.workspaceId } : {}),
      ...(dto.query
        ? {
            OR: [
              { name: { contains: dto.query, mode: Prisma.QueryMode.insensitive } },
              { description: { contains: dto.query, mode: Prisma.QueryMode.insensitive } },
            ],
          }
        : {}),
    };

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 10;

    const [groups, total] = await Promise.all([
      this.prisma.memberGroup.findMany({
        where,
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.memberGroup.count({ where }),
    ]);

    return this.groupPresenter.presentGroupList(groups, total, page, limit);
  }

  async createGroup(userId: string, dto: CreateGroupDto) {
    const group = await this.prisma.memberGroup.create({
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

    return this.groupPresenter.presentGroupInfo(group);
  }

  async updateGroup(userId: string, dto: UpdateGroupDto) {
    const group = await this.prisma.memberGroup.update({
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

    return this.groupPresenter.presentGroupInfo(group);
  }

  async deleteGroup(userId: string, dto: GroupInfoDto) {
    await this.prisma.memberGroup.delete({
      where: { id: dto.id },
    });

    return { success: true };
  }

  async addUserToGroup(userId: string, dto: AddGroupUserDto) {
    const group = await this.prisma.memberGroup.update({
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

    return this.groupPresenter.presentGroupInfo(group);
  }

  async removeUserFromGroup(userId: string, dto: RemoveGroupUserDto) {
    // First delete the member
    await this.prisma.memberGroupUser.deleteMany({
      where: {
        AND: [{ userId: dto.userId }, { groupId: dto.id }],
      },
    });

    // Then get the updated group
    const group = await this.prisma.memberGroup.findUnique({
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

    return this.groupPresenter.presentGroupInfo(group);
  }

  async searchGroupsForSharing(userId: string, docId: string, query?: string) {
    // Get all groups that already have access to the document
    const existingGroupIds = await this.prisma.docGroupPermission
      .findMany({
        where: { docId },
        select: { groupId: true },
      })
      .then((permissions) => permissions.map((p) => p.groupId));

    // Get all groups the user has access to
    const userGroups = await this.prisma.memberGroupUser
      .findMany({
        where: { userId },
        select: { groupId: true },
      })
      .then((memberships) => memberships.map((m) => m.groupId));

    // Search groups
    const groups = await this.prisma.memberGroup.findMany({
      where: {
        AND: [
          {
            OR: [{ name: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }],
          },
          {
            id: {
              in: userGroups, // Only show groups user has access to
              notIn: existingGroupIds, // Exclude groups that already have access
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            members: true, // Get member count
          },
        },
      },
      take: 10, // Limit results
    });

    return {
      data: groups.map((group) => ({
        ...group,
        memberCount: group._count.members,
      })),
    };
  }
}
