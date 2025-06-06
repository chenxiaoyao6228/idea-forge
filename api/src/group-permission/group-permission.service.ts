import { Inject, Injectable } from "@nestjs/common";
import { GroupPermissionListResponse } from "contracts";
import { CreateGroupPermissionDto, GroupPermissionListDto } from "./group-permission.dto";
import { presentGroupPermission } from "./group-permission.presenter";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { Permission, Prisma } from "@prisma/client";

@Injectable()
export class GroupPermissionService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prismaService: ExtendedPrismaClient) {}

  async list(dto: GroupPermissionListDto): Promise<GroupPermissionListResponse> {
    const { query, groupId, documentId, page = 1, limit = 10 } = dto;

    const where: Prisma.DocGroupPermissionWhereInput = {
      ...(groupId && { groupId }),
      ...(documentId && { docId: documentId }),
      ...(query && {
        OR: [{ group: { name: { contains: query, mode: "insensitive" } } }, { group: { description: { contains: query, mode: "insensitive" } } }],
      }),
    };

    const [permissions, total] = await Promise.all([
      this.prismaService.docGroupPermission.findMany({
        where,
        include: {
          group: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      this.prismaService.docGroupPermission.count({ where }),
    ]);

    return {
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
      },
      data: permissions.map(presentGroupPermission),
    };
  }

  async create(dto: CreateGroupPermissionDto) {
    const permission = await this.prismaService.docGroupPermission.create({
      data: {
        groupId: dto.groupId,
        docId: dto.documentId!,
        permission: dto.type as Permission,
        userId: Number(dto.userId),
        createdById: Number(dto.userId), // Using the same user as creator
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return presentGroupPermission(permission);
  }

  async delete(id: string): Promise<void> {
    await this.prismaService.docGroupPermission.delete({
      where: { id },
    });
  }
}
