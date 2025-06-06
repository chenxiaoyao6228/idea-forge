import { Inject, Injectable } from "@nestjs/common";
import { UserPermissionListResponse } from "contracts";
import { CreateUserPermissionDto, UserPermissionListDto } from "./user-permission.dto";
import { presentUserPermission } from "./user-permission.presenter";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { Permission, Prisma } from "@prisma/client";

@Injectable()
export class UserPermissionService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prismaService: ExtendedPrismaClient) {}

  async list(dto: UserPermissionListDto): Promise<UserPermissionListResponse> {
    const { query, userId, documentId, page = 1, limit = 10 } = dto;

    const where: Prisma.DocUserPermissionWhereInput = {
      ...(userId && { userId: Number(userId) }),
      ...(documentId && { docId: documentId }),
      ...(query && {
        OR: [{ user: { email: { contains: query, mode: "insensitive" } } }, { user: { displayName: { contains: query, mode: "insensitive" } } }],
      }),
    };

    const [permissions, total] = await Promise.all([
      this.prismaService.docUserPermission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
        },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
      }),
      this.prismaService.docUserPermission.count({ where }),
    ]);

    return {
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
      },
      data: permissions.map(presentUserPermission),
    };
  }

  async create(dto: CreateUserPermissionDto) {
    const permission = await this.prismaService.docUserPermission.create({
      data: {
        userId: Number(dto.userId),
        docId: dto.documentId!,
        permission: dto.type as Permission,
        createdById: Number(dto.userId), // Using the same user as creator
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return presentUserPermission(permission);
  }

  async delete(id: string): Promise<void> {
    await this.prismaService.docUserPermission.delete({
      where: { id },
    });
  }
}
