import { ApiException } from "@/_shared/exceptions/api.exception";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CommonSharedDocumentResponse, RemoveShareDto, ShareDocumentDto, UpdateSharePermissionDto } from "@idea/contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

@Injectable()
export class ShareDocumentService {
  constructor(private readonly prismaService: PrismaService) {}

  async getSharedDocuments(userId: string): Promise<CommonSharedDocumentResponse[]> {
    // Get all documents shared with this user through UnifiedPermission
    const permissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId: userId,
        resourceType: "DOCUMENT",
        sourceType: "DIRECT", // Only direct permissions, not inherited ones
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get the document IDs
    const documentIds = permissions.map((p) => p.resourceId);

    // Fetch documents with their details
    const documents = await this.prismaService.doc.findMany({
      where: {
        id: { in: documentIds },
      },
      include: {
        author: {
          select: {
            displayName: true,
            email: true,
          },
        },
        coverImage: true,
      },
    });

    // Create a map of document ID to permission
    const permissionMap = new Map();
    permissions.forEach((perm) => {
      permissionMap.set(perm.resourceId, perm.permission);
    });

    return documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      createdById: doc.authorId,
      workspaceId: doc.workspaceId,
      parentId: doc.parentId,
      archivedAt: null,
      deletedAt: null,
      icon: null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      owner: doc.author,
      coverImage: doc.coverImage,
      permission: permissionMap.get(doc.id),
    }));
  }

  async shareDocument(userId: string, docId: string, dto: ShareDocumentDto) {
    // 1. Verify document exists
    const doc = await this.prismaService.doc.findUnique({ where: { id: docId } });
    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    // 2. Base permission template
    const permissionBase: any = {
      resourceType: "DOCUMENT",
      resourceId: docId,
      permission: dto.permission,
      createdById: userId,
    };

    // 3. Track all created permissions with full data
    const createdPermissions: any[] = [];

    // 4. Batch grant permissions to users
    if (dto.targetUserIds && dto.targetUserIds.length > 0) {
      for (const targetUserId of dto.targetUserIds) {
        // Remove any existing permissions for this user to avoid duplicates
        await this.prismaService.unifiedPermission.deleteMany({
          where: {
            resourceType: "DOCUMENT",
            resourceId: docId,
            userId: targetUserId,
            sourceType: "DIRECT",
          },
        });

        // Create new permission
        const perm = await this.prismaService.unifiedPermission.create({
          data: {
            ...permissionBase,
            userId: targetUserId,
            sourceType: "DIRECT",
            priority: 1,
            sourceId: null,
          },
        });
        createdPermissions.push(perm);
      }
    }

    // 5. Batch grant permissions to groups
    if (dto.targetGroupIds && dto.targetGroupIds.length > 0) {
      for (const targetGroupId of dto.targetGroupIds) {
        // Get all members of the group
        const groupMembers = await this.prismaService.memberGroupUser.findMany({
          where: { groupId: targetGroupId },
          include: { user: true },
        });

        // Create permissions for each group member
        for (const member of groupMembers) {
          // Remove any existing permissions for this user to avoid duplicates
          await this.prismaService.unifiedPermission.deleteMany({
            where: {
              resourceType: "DOCUMENT",
              resourceId: docId,
              userId: member.userId,
              sourceType: "GROUP",
            },
          });

          // Create new permission
          const perm = await this.prismaService.unifiedPermission.create({
            data: {
              ...permissionBase,
              userId: member.userId,
              sourceType: "GROUP",
              priority: 2,
              sourceId: null,
            },
          });
          createdPermissions.push(perm);
        }
      }
    }

    // 6. Child document inheritance
    if (dto.includeChildDocuments) {
      // Get all child documents
      const childDocs = await this.prismaService.doc.findMany({
        where: {
          parentId: docId,
        },
      });

      for (const childDoc of childDocs) {
        for (const parentPerm of createdPermissions) {
          const childPerm = await this.prismaService.unifiedPermission.create({
            data: {
              ...permissionBase,
              resourceId: childDoc.id,
              userId: parentPerm.userId,
              sourceType: parentPerm.sourceType,
              priority: parentPerm.priority,
              sourceId: parentPerm.id,
            },
          });
        }
      }
    }

    return this.getDocShares(docId, userId);
  }

  // Method for ShareDocumentController that expects docId in the DTO
  async shareDocumentWithDocId(userId: string, dto: ShareDocumentDto & { docId: string }) {
    return this.shareDocument(userId, dto.docId, dto);
  }

  async getDocShares(id: string, userId: string) {
    // Get all permissions for this document
    const permissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType: "DOCUMENT",
        resourceId: id,
        sourceType: "DIRECT", // Only direct permissions, not inherited ones
      },
    });

    // Deduplicate permissions by user ID and keep the highest permission level
    const permissionMap = new Map<string, string>();
    const permissionLevels = ["NONE", "READ", "COMMENT", "EDIT", "MANAGE", "OWNER"];

    permissions.forEach((permission) => {
      if (permission.userId) {
        const currentLevel = permissionMap.get(permission.userId);
        const newLevel = permission.permission;

        if (!currentLevel || permissionLevels.indexOf(newLevel) > permissionLevels.indexOf(currentLevel)) {
          permissionMap.set(permission.userId, newLevel);
        }
      }
    });

    // Get unique user IDs from deduplicated permissions
    const userIds = Array.from(permissionMap.keys());

    // Fetch users with their details
    const users = await this.prismaService.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    // Create a map of user ID to user data
    const userMap = new Map();
    users.forEach((user) => {
      userMap.set(user.id, user);
    });

    // Transform to the expected format with deduplicated permissions
    return Array.from(permissionMap.entries()).map(([userId, permissionLevel]) => {
      const user = userMap.get(userId);
      return {
        id: user?.id || userId,
        email: user?.email || "",
        displayName: user?.displayName,
        permission: {
          level: permissionLevel,
        },
      };
    });
  }

  async removeShare(id: string, userId: string, dto: RemoveShareDto) {
    const doc = await this.prismaService.doc.findFirst({
      where: { id, authorId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    // Remove ALL permissions for this user from UnifiedPermission table (handles duplicates)
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        resourceType: "DOCUMENT",
        resourceId: id,
        userId: dto.targetUserId,
        sourceType: "DIRECT",
      },
    });

    return this.getDocShares(id, userId);
  }

  async updateSharePermission(id: string, userId: string, dto: UpdateSharePermissionDto) {
    const doc = await this.prismaService.doc.findFirst({
      where: { id, authorId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    // First, remove all existing permissions for this user to avoid duplicates
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        resourceType: "DOCUMENT",
        resourceId: id,
        userId: dto.userId,
        sourceType: "DIRECT",
      },
    });

    // Then create a single new permission with the updated level
    await this.prismaService.unifiedPermission.create({
      data: {
        resourceType: "DOCUMENT",
        resourceId: id,
        userId: dto.userId,
        permission: dto.permission,
        sourceType: "DIRECT",
        priority: 1,
        sourceId: null,
        createdById: userId,
      },
    });

    return this.getDocShares(id, userId);
  }
}
