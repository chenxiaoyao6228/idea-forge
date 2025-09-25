import { ApiException } from "@/_shared/exceptions/api.exception";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CommonSharedDocumentResponse, RemoveShareDto, RemoveGroupShareDto, ShareDocumentDto, UpdateSharePermissionDto } from "@idea/contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionInheritanceType, PermissionLevel } from "@idea/contracts";

@Injectable()
export class ShareDocumentService {
  constructor(private readonly prismaService: PrismaService) {}

  async getSharedDocuments(userId: string): Promise<CommonSharedDocumentResponse[]> {
    // Get all documents shared with this user through DocumentPermission (direct shares only)
    const permissions = await this.prismaService.documentPermission.findMany({
      where: {
        userId: userId,

        inheritedFromType: PermissionInheritanceType.DIRECT, // Only direct permissions, not inherited ones
        createdById: { not: userId }, // Exclude self-created permissions
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get the document IDs
    const docIds = permissions.map((p) => p.docId);

    if (docIds.length === 0) {
      return [];
    }

    // Fetch documents with their details
    const documents = await this.prismaService.doc.findMany({
      where: {
        id: { in: docIds },
        deletedAt: null, // Exclude deleted documents
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

    return documents.map((doc) => {
      return {
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
        permission: { level: "READ" as const },
      };
    });
  }

  async shareDocument(userId: string, docId: string, dto: ShareDocumentDto) {
    // 1. Verify document exists
    const doc = await this.prismaService.doc.findUnique({ where: { id: docId } });
    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    // 2. Base permission template
    const permissionBase: any = {
      docId: docId,
      permission: dto.permission,
      createdById: userId,
    };

    // 3. Track all created permissions with full data
    const createdPermissions: any[] = [];

    // 4. Batch grant permissions to users
    if (dto.targetUserIds && dto.targetUserIds.length > 0) {
      for (const targetUserId of dto.targetUserIds) {
        // Remove any existing permissions for this user to avoid duplicates
        await this.prismaService.documentPermission.deleteMany({
          where: {
            docId: docId,
            userId: targetUserId,
            inheritedFromType: "DIRECT",
          },
        });

        // Create new permission
        const perm = await this.prismaService.documentPermission.create({
          data: {
            ...permissionBase,
            userId: targetUserId,
            inheritedFromType: "DIRECT",
            priority: 1,
            inheritedFromId: null,
          },
        });
        createdPermissions.push(perm);

        // Invalidate permission cache for the target user
        // this.permissionContextService.invalidatePermissionCache(targetUserId, ReinheritedFromType.DOCUMENT, docId);
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
          await this.prismaService.documentPermission.deleteMany({
            where: {
              docId: docId,
              userId: member.userId,
              inheritedFromType: "GROUP",
            },
          });

          // Create new permission for group member
          const perm = await this.prismaService.documentPermission.create({
            data: {
              ...permissionBase,
              userId: member.userId,
              inheritedFromType: "GROUP",
              priority: 2,
              inheritedFromId: null, // Group permissions don't inherit from other document permissions
            },
          });
          createdPermissions.push(perm);

          // Invalidate permission cache for the group member
          // this.permissionContextService.invalidatePermissionCache(member.userId, ReinheritedFromType.DOCUMENT, docId);
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
          const childPerm = await this.prismaService.documentPermission.create({
            data: {
              ...permissionBase,
              docId: childDoc.id,
              userId: parentPerm.userId,
              inheritedFromType: parentPerm.inheritedFromType,
              priority: parentPerm.priority,
              inheritedFromId: null, // Child documents don't inherit from parent permissions directly
            },
          });
        }
      }
    }

    // 7. Send WebSocket notifications to newly shared users
    const allSharedUserIds = new Set<string>();

    // Collect all users who received new permissions
    for (const permission of createdPermissions) {
      if (permission.userId) {
        allSharedUserIds.add(permission.userId);
      }
    }

    // Send notifications to each newly shared user
    for (const sharedUserId of allSharedUserIds) {
      const shareType = dto.targetGroupIds && dto.targetGroupIds.length > 0 ? "GROUP" : "DIRECT";
      // await this.permissionWebsocketService.notifyDocumentShared(docId, sharedUserId, dto.permission, userId, shareType);
    }

    return this.getDocShares(docId, userId);
  }

  // Method for ShareDocumentController that expects docId in the DTO
  async shareDocumentWithDocId(userId: string, dto: ShareDocumentDto & { docId: string }) {
    return this.shareDocument(userId, dto.docId, dto);
  }

  async getDocShares(id: string, userId: string) {
    const [userShares, groupShares] = await Promise.all([this.getDirectUserShares(id), this.getGroupShares(id)]);

    return [...userShares, ...groupShares];
  }

  private async getDirectUserShares(docId: string) {
    // Get direct user permissions
    const userPermissions = await this.prismaService.documentPermission.findMany({
      where: {
        docId,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        userId: { not: null },
      },
    });

    // Deduplicate and get highest permission level for each user
    const userPermissionMap = this.deduplicatePermissions(userPermissions);

    if (userPermissionMap.size === 0) {
      return [];
    }

    // Fetch user details
    const userIds = Array.from(userPermissionMap.keys());
    const users = await this.prismaService.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    // Create user map for quick lookup
    const userMap = new Map(users.map((user) => [user.id, user]));

    // Transform to expected format
    return Array.from(userPermissionMap.entries()).map(([userId, permissionLevel]) => {
      const user = userMap.get(userId);
      return {
        id: user?.id || userId,
        email: user?.email || "",
        displayName: user?.displayName,
        permission: { level: permissionLevel },
        type: "user" as const,
      };
    });
  }

  private async getGroupShares(docId: string) {
    // Get group permissions with user and group information
    const groupPermissionsWithGroups = await this.prismaService.documentPermission.findMany({
      where: {
        docId,
        inheritedFromType: PermissionInheritanceType.GROUP,
      },
      include: {
        user: {
          include: {
            memberGroups: {
              include: {
                group: true,
              },
            },
          },
        },
      },
    });

    // Process group permissions to get unique groups with highest permission level
    const groupPermissionMap = new Map<string, string>();
    const permissionLevels = ["NONE", "READ", "COMMENT", "EDIT", "MANAGE"];

    groupPermissionsWithGroups.forEach((permission) => {
      const userGroup = permission.user?.memberGroups?.[0]?.group;
      if (userGroup) {
        const currentLevel = groupPermissionMap.get(userGroup.id);
        const newLevel = permission.permission;

        if (!currentLevel || permissionLevels.indexOf(newLevel) > permissionLevels.indexOf(currentLevel)) {
          groupPermissionMap.set(userGroup.id, newLevel);
        }
      }
    });

    if (groupPermissionMap.size === 0) {
      return [];
    }

    // Fetch group details
    const groupIds = Array.from(groupPermissionMap.keys());
    const groups = await this.prismaService.memberGroup.findMany({
      where: { id: { in: groupIds } },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    // Create group map for quick lookup
    const groupMap = new Map(groups.map((group) => [group.id, group]));

    // Transform to expected format
    return Array.from(groupPermissionMap.entries()).map(([groupId, permission]) => {
      const group = groupMap.get(groupId);
      return {
        id: group?.id || groupId,
        name: group?.name || "",
        description: group?.description,
        memberCount: group?._count?.members || 0,
        permission: { level: permission },
        type: "group" as const,
      };
    });
  }

  private deduplicatePermissions(permissions: any[]): Map<string, string> {
    const permissionMap = new Map<string, string>();
    const permissionLevels = ["NONE", "READ", "COMMENT", "EDIT", "MANAGE"];

    permissions.forEach((permission) => {
      if (permission.userId) {
        const currentLevel = permissionMap.get(permission.userId);
        const newLevel = permission.permission;

        if (!currentLevel || permissionLevels.indexOf(newLevel) > permissionLevels.indexOf(currentLevel)) {
          permissionMap.set(permission.userId, newLevel);
        }
      }
    });

    return permissionMap;
  }

  async removeShare(id: string, userId: string, dto: RemoveShareDto) {
    const doc = await this.prismaService.doc.findFirst({
      where: { id, authorId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    // Remove ALL permissions for this user from DocumentPermission table (handles duplicates)
    await this.prismaService.documentPermission.deleteMany({
      where: {
        docId: id,
        userId: dto.targetUserId,
        inheritedFromType: PermissionInheritanceType.DIRECT,
      },
    });

    return this.getDocShares(id, userId);
  }

  async removeGroupShare(id: string, userId: string, dto: RemoveGroupShareDto) {
    const doc = await this.prismaService.doc.findFirst({
      where: { id, authorId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    // Get all users in the group
    const groupMembers = await this.prismaService.memberGroup.findUnique({
      where: { id: dto.targetGroupId },
      include: {
        members: {
          select: { userId: true },
        },
      },
    });

    if (!groupMembers) {
      throw new NotFoundException("Group not found");
    }

    const userIds = groupMembers.members.map((member) => member.userId);

    // Remove ALL group permissions for users in this group from DocumentPermission table
    await this.prismaService.documentPermission.deleteMany({
      where: {
        docId: id,
        userId: { in: userIds },
        inheritedFromType: PermissionInheritanceType.GROUP,
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
    await this.prismaService.documentPermission.deleteMany({
      where: {
        docId: id,
        userId: dto.userId,
        inheritedFromType: PermissionInheritanceType.DIRECT,
      },
    });

    // Then create a single new permission with the updated level
    await this.prismaService.documentPermission.create({
      data: {
        docId: id,
        userId: dto.userId,
        permission: dto.permission,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        priority: 1,
        inheritedFromId: null,
        createdById: userId,
      },
    });

    return this.getDocShares(id, userId);
  }
}
