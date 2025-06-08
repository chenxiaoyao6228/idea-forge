import { Inject, Injectable } from "@nestjs/common";
import { UserPermissionListResponse } from "contracts";
import { CreateUserPermissionDto, UserPermissionListDto } from "./user-permission.dto";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import fractionalIndex from "fractional-index";

@Injectable()
export class UserPermissionService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  async list(dto: UserPermissionListDto): Promise<UserPermissionListResponse> {
    const { query, documentId, page = 1, limit = 10 } = dto;
    const skip = (page - 1) * limit;
    const take = limit;

    // Build where clause for Prisma
    const where: any = {};
    if (documentId) where.docId = documentId;
    if (query) {
      where.user = {
        OR: [{ email: { contains: query, mode: "insensitive" } }, { displayName: { contains: query, mode: "insensitive" } }],
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.docUserPermission.count({ where }),
      this.prisma.docUserPermission.findMany({
        where,
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          doc: {
            select: {
              id: true,
              title: true,
              icon: true,
              parentId: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const docIds = [...new Set(items.map((item) => item.docId))];
    const documents = await this.prisma.doc.findMany({
      where: { id: { in: docIds } },
      select: {
        id: true,
        title: true,
        icon: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      pagination: {
        page,
        limit,
        total,
      },
      data: {
        userPermissions: items.map((item) => ({
          id: item.id,
          userId: item.userId,
          documentId: item.docId,
          permission: item.permission,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
          user: {
            id: item.user.id.toString(),
            email: item.user.email,
            displayName: item.user.displayName || "",
          },
        })),
        documents: documents.map((doc) => ({
          id: doc.id,
          title: doc.title,
          icon: doc.icon,
          parentId: doc.parentId,
          createdAt: doc.createdAt.toISOString(),
          updatedAt: doc.updatedAt.toISOString(),
        })),
      },
      policies: {
        // Placeholder for policies
        create: true,
        update: true,
        delete: true,
      },
    };
  }

  async create(userId: string, dto: CreateUserPermissionDto) {
    const { documentId, permission } = dto;

    if (!documentId) throw new Error("documentId is required");

    // Check if permission already exists
    const existingPermission = await this.prisma.docUserPermission.findUnique({
      where: {
        docId_userId: {
          docId: documentId,
          userId: dto.userId,
        },
      },
    });

    if (existingPermission) {
      // Update existing permission
      return this.prisma.docUserPermission.update({
        where: {
          id: existingPermission.id,
        },
        data: {
          permission,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
            },
          },
          doc: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });
    }

    // Get existing permissions to calculate fractional index
    const existingMemberships = await this.prisma.docUserPermission.findMany({
      where: { userId },
      select: { id: true, index: true, updatedAt: true },
      orderBy: [{ index: "asc" }, { updatedAt: "desc" }],
      take: 1,
    });

    // Use fractional index instead of integer
    const index = fractionalIndex(null, existingMemberships.length ? existingMemberships[0].index : null);

    // Create new permission
    return this.prisma.docUserPermission.create({
      data: {
        userId: dto.userId,
        docId: documentId,
        permission,
        index,
        createdById: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        doc: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.docUserPermission.delete({
      where: {
        id,
      },
    });
  }

  async updateIndex(id: string, newIndex: string) {
    const permission = await this.prisma.docUserPermission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        doc: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!permission) {
      throw new Error("Permission not found");
    }

    // Direct update with fractional index - no need to reorder other records
    return this.prisma.docUserPermission.update({
      where: { id },
      data: { index: newIndex },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        doc: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }
}
