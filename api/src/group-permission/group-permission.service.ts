import { Injectable, NotFoundException, Inject } from "@nestjs/common";
import type { GroupPermissionDto, GroupPermissionListRequestDto } from "./group-permission.dto";
import type { DocGroupPermission, Prisma } from "@prisma/client";
import { PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import type { ExtendedPrismaClient } from "@/_shared/database/prisma/prisma.extension";
import { presentGroupPermission } from "./group-permission.presenter";
import type { GroupPermissionListResponse, GroupPermissionResponse } from "contracts";
import { presentDocument } from "@/document/document.presenter";

@Injectable()
export class GroupPermissionService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  async list(query: GroupPermissionListRequestDto): Promise<GroupPermissionListResponse> {
    const { page = 1, limit = 10, query: searchQuery, groupId, documentId } = query;

    const where: Prisma.DocGroupPermissionWhereInput = {
      ...(searchQuery && {
        OR: [{ group: { name: { contains: searchQuery, mode: "insensitive" } } }, { doc: { title: { contains: searchQuery, mode: "insensitive" } } }],
      }),
      ...(groupId && { groupId }),
      ...(documentId && { docId: documentId }),
    };

    const [total, permissions] = await Promise.all([
      this.prisma.docGroupPermission.count({ where }),
      this.prisma.docGroupPermission.findMany({
        where,
        include: {
          group: {
            include: {
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
          doc: true,
        },
        skip: (page - 1) * limit,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const documentIds = permissions.map((p) => p.docId).filter(Boolean);
    const documents = documentIds.length
      ? await this.prisma.doc.findMany({
          where: { id: { in: documentIds } },
        })
      : [];

    return {
      pagination: {
        page,
        limit,
        total,
      },
      data: {
        groupPermissions: permissions.map(presentGroupPermission),
        documents: documents.map((d) => presentDocument(d, { isPublic: true })),
      },
      policies: {}, // TODO: Implement policies
    };
  }

  async create(data: GroupPermissionDto, userId: string): Promise<GroupPermissionResponse> {
    const { groupId, docId, permission } = data;

    if (!docId) {
      throw new Error("Document ID is required");
    }

    // Check if permission already exists
    const existingPermission = await this.prisma.docGroupPermission.findUnique({
      where: {
        docId_groupId: {
          docId,
          groupId,
        },
      },
    });

    if (existingPermission) {
      // Update existing permission
      const result = await this.prisma.docGroupPermission.update({
        where: {
          id: existingPermission.id,
        },
        data: {
          permission,
        },
        include: {
          group: {
            include: {
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
          doc: true,
        },
      });

      return presentGroupPermission(result);
    }

    // Create new permission
    const result = await this.prisma.docGroupPermission.create({
      data: {
        groupId,
        docId,
        permission,
        userId,
        createdById: userId,
      },
      include: {
        group: {
          include: {
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
        doc: true,
      },
    });

    return presentGroupPermission(result);
  }

  async delete(id: string): Promise<void> {
    const permission = await this.prisma.docGroupPermission.findUnique({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(`Group permission with ID ${id} not found`);
    }

    await this.prisma.docGroupPermission.delete({
      where: { id },
    });
  }

  // TODO: 权限继承机制
  // // 权限创建时的传播
  // async createInheritedPermissions(permission: DocGroupPermission) {
  //   if (permission.sourceId) return; // 如果已经是继承权限，跳过

  //   const childDocs = await this.findChildDocuments(permission.docId);

  //   for (const childDoc of childDocs) {
  //     await this.prisma.docGroupPermission.create({
  //       data: {
  //         docId: childDoc.id,
  //         groupId: permission.groupId,
  //         permission: permission.permission,
  //         sourceId: permission.id, // 指向父权限
  //         userId: permission.userId,
  //         createdById: permission.createdById,
  //       },
  //     });
  //   }
  // }

  // // 权限更新时的传播
  // async updateInheritedPermissions(permission: DocGroupPermission) {
  //   if (permission.sourceId) return; // 继承权限不能直接更新

  //   await this.prisma.docGroupPermission.updateMany({
  //     where: {
  //       sourceId: permission.id,
  //     },
  //     data: {
  //       permission: permission.permission,
  //     },
  //   });
  // }

  // // 查找根权限
  // async findRootPermission(permissionId: string): Promise<DocGroupPermission> {
  //   const permission = await this.prisma.docGroupPermission.findUnique({
  //     where: { id: permissionId },
  //   });

  //   if (!permission?.sourceId) {
  //     return permission;
  //   }

  //   return this.findRootPermission(permission.sourceId);
  // }
}
