import { ApiException } from "@/_shared/exceptions/api.exception";
import { Injectable, NotFoundException } from "@nestjs/common";
import { CommonSharedDocumentResponse, RemoveShareDto, RemoveGroupShareDto, ShareDocumentDto, UpdateSharePermissionDto } from "@idea/contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionInheritanceType } from "@idea/contracts";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import type { DocumentPermission, Prisma } from "@prisma/client";

// Type definitions for internal use
type DocContext = {
  id: string;
  workspaceId: string;
  parentId: string | null;
  subspaceId: string | null;
};

type UserShareData = {
  id: string;
  email: string;
  displayName: string | null;
  permission: { level: string };
  permissionSource?: {
    level: string;
    source: string;
    sourceDocId?: string;
    sourceDocTitle?: string;
    priority?: number;
  };
  grantedBy?: {
    displayName: string | null;
    email: string;
  };
  type: "user";
  hasParentPermission?: boolean;
  parentPermissionSource?: {
    level?: string;
    source: string;
    sourceDocId?: string;
    sourceDocTitle?: string;
    priority?: number;
  };
};

type GroupShareData = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  permission: { level: string };
  permissionSource?: {
    level: string;
    source: string;
    sourceDocId?: string;
    sourceDocTitle?: string;
    priority?: number;
  };
  grantedBy?: {
    displayName: string | null;
    email: string;
  };
  sourceGroups?: Array<{
    id: string;
    name: string;
  }>; // Groups that granted this permission (for users in multiple groups)
  type: "group";
  hasParentPermission?: boolean;
  parentPermissionSource?: {
    level?: string;
    source: string;
    sourceDocId?: string;
    sourceDocTitle?: string;
    priority?: number;
  };
};

type ShareData = UserShareData | GroupShareData;

type DocumentWithRelations = Prisma.DocGetPayload<{
  include: {
    author: {
      select: {
        displayName: true;
        email: true;
      };
    };
    coverImage: true;
    subspace: {
      select: {
        id: true;
        type: true;
        members: {
          where: { userId: string };
          select: { id: true };
        };
      };
    };
  };
}>;

@Injectable()
export class ShareDocumentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly docPermissionResolveService: DocPermissionResolveService,
  ) {}

  async getSharedWithMeDocuments(
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      workspaceId?: string;
    },
  ): Promise<{ pagination: { page: number; limit: number; total: number; pageCount: number }; data: { documents: CommonSharedDocumentResponse[] } }> {
    const { page = 1, limit = 100, workspaceId } = options || {};

    // Get all documents shared with this user through DocumentPermission
    // Include both DIRECT and GROUP permissions, but exclude GUEST (handled separately if needed)
    const permissions = await this.prismaService.documentPermission.findMany({
      where: {
        userId: userId,
        inheritedFromType: { in: [PermissionInheritanceType.DIRECT, PermissionInheritanceType.GROUP] },
        createdById: { not: userId }, // Exclude self-created permissions
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get the document IDs
    const docIds = permissions.map((p) => p.docId);

    if (docIds.length === 0) {
      return {
        pagination: { page, limit, total: 0, pageCount: 0 },
        data: { documents: [] },
      };
    }

    // Fetch documents with their details
    // Shared-with-me should show documents that have no other navigation entry point:
    // 1. Documents in PERSONAL subspaces shared from other users (cross-personal sharing)
    // 2. Documents in subspaces where the user is NOT a member (no access to subspace tree)
    // This is because:
    // - Subspace members can access documents through the subspace navigation tree
    // - Documents shown here are "orphaned" - user has direct permission but no navigation path
    // - Guest collaborators see all shared documents here since they have no subspace access

    // Filter documents based on navigation accessibility
    // Case 1: Personal subspace documents user doesn't own (cross-personal sharing)
    // Case 2: Documents in subspaces where user is not a member (no tree access)

    // First, get all documents with direct permissions
    const whereClause: any = {
      id: { in: docIds },
      deletedAt: null,
    };

    // Add workspace filter if provided
    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }

    const allDocs = await this.prismaService.doc.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            displayName: true,
            email: true,
          },
        },
        coverImage: true,
        subspace: {
          select: {
            id: true,
            type: true,
            members: {
              where: { userId },
              select: { id: true },
            },
          },
        },
      },
    });

    // Filter documents manually based on navigation accessibility
    const documents = allDocs.filter((doc) => {
      if (!doc.subspace) return false; // Documents must have a subspace

      // Case 1: Cross-personal subspace sharing
      const isCrossPersonal = doc.subspace.type === "PERSONAL" && doc.authorId !== userId;

      // Case 2: User is not a member of the subspace (no navigation access)
      const isNonMember = doc.subspace.members.length === 0;

      return isCrossPersonal || isNonMember;
    });

    // Filter out child documents whose ancestors are also in the shared list
    // This prevents showing both parent and child documents in "shared-with-me"
    const docIdSet = new Set(docIds);
    const filteredDocuments: DocumentWithRelations[] = [];

    for (const doc of documents) {
      // Check if any ancestor of this document is also shared
      let currentParentId = doc.parentId;
      let hasSharedAncestor = false;

      while (currentParentId) {
        if (docIdSet.has(currentParentId)) {
          // Ancestor is shared, exclude this document
          hasSharedAncestor = true;
          break;
        }

        // Try to find parent in the documents array first (optimization)
        const parentDocInArray = documents.find((d) => d.id === currentParentId);

        // If not found, fetch from database to continue walking up the chain
        if (!parentDocInArray) {
          const parentDocFromDb = await this.prismaService.doc.findUnique({
            where: { id: currentParentId },
            select: { id: true, parentId: true },
          });
          currentParentId = parentDocFromDb?.parentId ?? null;
        } else {
          currentParentId = parentDocInArray.parentId;
        }
      }

      if (!hasSharedAncestor) {
        filteredDocuments.push(doc);
      }
    }

    // Apply pagination
    const total = filteredDocuments.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDocs = filteredDocuments.slice(startIndex, endIndex);

    const documentResponses = paginatedDocs.map((doc) => {
      return {
        id: doc.id,
        title: doc.title,
        content: null,
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
        subspaceAdminPermission: doc.subspaceAdminPermission,
        subspaceMemberPermission: doc.subspaceMemberPermission,
        nonSubspaceMemberPermission: doc.nonSubspaceMemberPermission,
      };
    });

    return {
      pagination: {
        page,
        limit,
        total,
        pageCount: Math.ceil(total / limit),
      },
      data: {
        documents: documentResponses,
      },
    };
  }

  async shareDocument(userId: string, docId: string, dto: ShareDocumentDto) {
    // 1. Verify document exists
    const doc = await this.prismaService.doc.findUnique({ where: { id: docId } });
    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    // 2. Base permission template
    const permissionBase = {
      docId: docId,
      permission: dto.permission,
      createdById: userId,
    } as const;

    // 3. Track all created permissions with full data
    const createdPermissions: DocumentPermission[] = [];

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
      const permissionLevels = ["NONE", "READ", "COMMENT", "EDIT", "MANAGE"];

      for (const targetGroupId of dto.targetGroupIds) {
        // Get all members of the group
        const groupMembers = await this.prismaService.memberGroupUser.findMany({
          where: { groupId: targetGroupId },
          include: { user: true },
        });

        // Create permissions for each group member
        for (const member of groupMembers) {
          // Check if user already has a GROUP permission from this group on this document
          const existingPermission = await this.prismaService.documentPermission.findFirst({
            where: {
              docId: docId,
              userId: member.userId,
              inheritedFromType: "GROUP",
              sourceGroupId: targetGroupId,
            },
          });

          if (existingPermission) {
            // Compare permission levels and update if new level is higher
            const existingLevelIndex = permissionLevels.indexOf(existingPermission.permission);
            const newLevelIndex = permissionLevels.indexOf(dto.permission);

            if (newLevelIndex > existingLevelIndex) {
              // Update to higher permission level
              const updatedPerm = await this.prismaService.documentPermission.update({
                where: { id: existingPermission.id },
                data: {
                  permission: dto.permission,
                  createdById: userId,
                  updatedAt: new Date(),
                },
              });
              createdPermissions.push(updatedPerm);
            }
            // If existing level is higher or equal, skip (keep existing)
          } else {
            // Create new permission for group member with sourceGroupId
            const perm = await this.prismaService.documentPermission.create({
              data: {
                ...permissionBase,
                userId: member.userId,
                inheritedFromType: "GROUP",
                sourceGroupId: targetGroupId,
                priority: 2,
                inheritedFromId: null, // Group permissions don't inherit from other document permissions
              },
            });
            createdPermissions.push(perm);
          }

          // Invalidate permission cache for the group member
          // this.permissionContextService.invalidatePermissionCache(member.userId, ReinheritedFromType.DOCUMENT, docId);
        }
      }
    }

    // Child document inheritance is resolved on-demand, so includeChildDocuments requires no extra writes.

    // 6. Send WebSocket notifications to newly shared users
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

      // Send websocket notification to the newly shared user
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.DOCUMENT_SHARED,
        workspaceId: doc.workspaceId,
        actorId: userId,
        data: {
          docId: docId,
          sharedUserId: sharedUserId,
          document: doc,
          permission: dto.permission,
          shareType: shareType,
          sharedByUserId: userId,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return this.getDocumentCollaborators(docId, userId);
  }

  // Method for ShareDocumentController that expects docId in the DTO
  async shareDocumentWithDocId(userId: string, dto: ShareDocumentDto & { docId: string }) {
    return this.shareDocument(userId, dto.docId, dto);
  }

  async getDocumentCollaborators(id: string, userId: string) {
    // Get document context for permission resolution
    const document = await this.prismaService.doc.findUnique({
      where: { id },
      select: {
        id: true,
        workspaceId: true,
        parentId: true,
        subspaceId: true,
      },
    });

    if (!document) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // 1. Get DIRECT permissions on current document
    const [directUserShares, directGroupShares] = await Promise.all([this.getDirectUserShares(id, document), this.getGroupShares(id, document)]);

    // 2. Get INHERITED permissions from parent documents
    const [inheritedUserShares, inheritedGroupShares] = await Promise.all([
      this.getInheritedUserShares(id, document),
      this.getInheritedGroupShares(id, document),
    ]);

    // 3. Merge and deduplicate (direct permissions override inherited)
    const mergedUserShares = this.mergeDirectAndInherited(directUserShares, inheritedUserShares);
    const mergedGroupShares = this.mergeDirectAndInherited(directGroupShares, inheritedGroupShares);

    // 4. Ensure current user is always in the list with their effective permission
    const currentUserExists = mergedUserShares.some((share) => share.id === userId);
    if (!currentUserExists) {
      // User doesn't have direct or inherited permission, but might have subspace/workspace permission
      // Resolve their effective permission
      const currentUserPermission = await this.docPermissionResolveService.resolveUserPermissionForDocument(userId, document);

      if (currentUserPermission.level !== "NONE") {
        const user = await this.prismaService.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, displayName: true },
        });

        if (user) {
          mergedUserShares.unshift({
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            permission: { level: currentUserPermission.level },
            permissionSource: {
              level: currentUserPermission.level,
              source: currentUserPermission.source,
              sourceDocId: currentUserPermission.sourceDocId,
              sourceDocTitle: currentUserPermission.sourceDocTitle,
              priority: currentUserPermission.priority,
            },
            type: "user" as const,
          });
        }
      }
    }

    return [...mergedUserShares, ...mergedGroupShares];
  }

  private async getDirectUserShares(docId: string, docContext: DocContext): Promise<UserShareData[]> {
    // Get direct user permissions with createdBy info
    const userPermissions = await this.prismaService.documentPermission.findMany({
      where: {
        docId,
        inheritedFromType: PermissionInheritanceType.DIRECT,
        userId: { not: null },
      },
      include: {
        createdBy: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
    });

    // Deduplicate and get highest permission level for each user, keeping createdBy info
    const userPermissionMap = new Map<string, { level: string; createdBy: any }>();
    const permissionLevels = ["NONE", "READ", "COMMENT", "EDIT", "MANAGE"];

    userPermissions.forEach((permission) => {
      if (permission.userId) {
        const currentEntry = userPermissionMap.get(permission.userId);
        const newLevel = permission.permission;

        if (!currentEntry || permissionLevels.indexOf(newLevel) > permissionLevels.indexOf(currentEntry.level)) {
          userPermissionMap.set(permission.userId, {
            level: newLevel,
            createdBy: permission.createdBy,
          });
        }
      }
    });

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

    // Resolve permission sources for all users
    const permissionSources = await Promise.all(
      Array.from(userPermissionMap.keys()).map((userId) => this.docPermissionResolveService.resolveUserPermissionForDocument(userId, docContext)),
    );

    const permissionSourceMap = new Map(Array.from(userPermissionMap.keys()).map((userId, index) => [userId, permissionSources[index]]));

    // Transform to expected format
    return Array.from(userPermissionMap.entries()).map(([userId, permData]) => {
      const user = userMap.get(userId);
      const permissionSource = permissionSourceMap.get(userId);
      return {
        id: user?.id || userId,
        email: user?.email || "",
        displayName: user?.displayName ?? null,
        permission: { level: permData.level },
        // Serialize permissionSource to avoid circular references
        permissionSource: permissionSource
          ? {
              level: permissionSource.level,
              source: permissionSource.source,
              sourceDocId: permissionSource.sourceDocId,
              sourceDocTitle: permissionSource.sourceDocTitle,
              priority: permissionSource.priority,
            }
          : undefined,
        grantedBy: permData.createdBy
          ? {
              displayName: permData.createdBy.displayName,
              email: permData.createdBy.email,
            }
          : undefined,
        type: "user" as const,
      };
    });
  }

  private async getGroupShares(docId: string, docContext: DocContext): Promise<GroupShareData[]> {
    // Get group permissions with sourceGroupId
    const groupPermissionsWithGroups = await this.prismaService.documentPermission.findMany({
      where: {
        docId,
        inheritedFromType: PermissionInheritanceType.GROUP,
      },
      include: {
        sourceGroup: true,
        createdBy: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
    });

    // Process group permissions to get unique groups with highest permission level
    const groupPermissionMap = new Map<string, { level: string; createdBy: any }>();
    const groupUserMap = new Map<string, string>(); // Track a user ID for each group for permission resolution
    const permissionLevels = ["NONE", "READ", "COMMENT", "EDIT", "MANAGE"];

    groupPermissionsWithGroups.forEach((permission) => {
      if (permission.sourceGroup && permission.userId) {
        const groupId = permission.sourceGroup.id;
        const currentEntry = groupPermissionMap.get(groupId);
        const newLevel = permission.permission;

        if (!currentEntry || permissionLevels.indexOf(newLevel) > permissionLevels.indexOf(currentEntry.level)) {
          groupPermissionMap.set(groupId, {
            level: newLevel,
            createdBy: permission.createdBy,
          });
          groupUserMap.set(groupId, permission.userId); // Track user for permission resolution
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

    // Resolve permission sources for groups (using a representative user from each group)
    const permissionSources = await Promise.all(
      groupIds.map((groupId) => {
        const userId = groupUserMap.get(groupId);
        return userId ? this.docPermissionResolveService.resolveUserPermissionForDocument(userId, docContext) : Promise.resolve(null);
      }),
    );

    const permissionSourceMap = new Map(groupIds.map((groupId, index) => [groupId, permissionSources[index]]));

    // Transform to expected format
    return Array.from(groupPermissionMap.entries()).map(([groupId, permData]) => {
      const group = groupMap.get(groupId);
      const permissionSource = permissionSourceMap.get(groupId);
      return {
        id: group?.id || groupId,
        name: group?.name || "",
        description: group?.description ?? null,
        memberCount: group?._count?.members || 0,
        permission: { level: permData.level },
        // Serialize permissionSource to avoid circular references
        permissionSource: permissionSource
          ? {
              level: permissionSource.level,
              source: permissionSource.source,
              sourceDocId: permissionSource.sourceDocId,
              sourceDocTitle: permissionSource.sourceDocTitle,
              priority: permissionSource.priority,
            }
          : undefined,
        grantedBy: permData.createdBy
          ? {
              displayName: permData.createdBy.displayName,
              email: permData.createdBy.email,
            }
          : undefined,
        type: "group" as const,
      };
    });
  }

  // Get ancestor permissions recursively
  private async getAncestorPermissions(parentId: string | null, visited = new Set<string>()): Promise<DocumentPermission[]> {
    if (!parentId || visited.has(parentId) || visited.size >= 25) return []; // Prevent cycles and limit depth
    visited.add(parentId);

    // Get both DIRECT and GROUP permissions on this parent
    const parentPerms = await this.prismaService.documentPermission.findMany({
      where: { docId: parentId, inheritedFromType: { in: [PermissionInheritanceType.DIRECT, PermissionInheritanceType.GROUP] } },
    });

    // Get parent's parent
    const parent = await this.prismaService.doc.findUnique({
      where: { id: parentId },
      select: { parentId: true },
    });

    // Recursively get grandparent permissions (only if grandparent exists)
    const grandparentPerms = parent?.parentId ? await this.getAncestorPermissions(parent.parentId, visited) : [];

    return [...parentPerms, ...grandparentPerms];
  }

  // Get inherited user permissions from parent chain
  // This returns ALL users who have permissions on parent documents, regardless of child permissions
  private async getInheritedUserShares(docId: string, docContext: DocContext): Promise<UserShareData[]> {
    if (!docContext.parentId) return []; // No parent, no inherited permissions

    // Fetch parent document context to resolve permissions from parent's perspective
    const parentDoc = await this.prismaService.doc.findUnique({
      where: { id: docContext.parentId },
      select: { id: true, title: true, parentId: true, workspaceId: true, subspaceId: true },
    });

    if (!parentDoc) return [];

    const parentContext: DocContext = {
      id: parentDoc.id,
      workspaceId: parentDoc.workspaceId,
      parentId: parentDoc.parentId,
      subspaceId: parentDoc.subspaceId,
    };

    // Walk up parent chain and collect all user permissions
    const ancestorPermissions = await this.getAncestorPermissions(docContext.parentId);

    // For each user with ancestor permission, get their info
    // Include BOTH DIRECT and GROUP permissions (users inherit from both types)
    const userPermissions = ancestorPermissions.filter(
      (p) => p.userId && (p.inheritedFromType === PermissionInheritanceType.DIRECT || p.inheritedFromType === PermissionInheritanceType.GROUP),
    );

    // Deduplicate users (same user might have permissions on multiple ancestors)
    // Note: resolveUserPermissionForDocument will automatically return the HIGHEST permission
    // from the parent chain, so we only need to process each unique user once
    const uniqueUserIds = new Set<string>();
    const inheritedShares: UserShareData[] = [];

    for (const perm of userPermissions) {
      if (!perm.userId) continue; // TypeScript type narrowing

      // Skip if we've already processed this user
      if (uniqueUserIds.has(perm.userId)) continue;
      uniqueUserIds.add(perm.userId);

      // Resolve permission from parent's perspective (not child's)
      // This ensures we get the true inherited permission source, not the child's direct permission
      // The resolver automatically returns the HIGHEST permission level from the parent chain
      const permissionSource = await this.docPermissionResolveService.resolveUserPermissionForDocument(perm.userId, parentContext);

      const user = await this.prismaService.user.findUnique({
        where: { id: perm.userId },
        select: { id: true, email: true, displayName: true },
      });

      if (user) {
        // Always include users who have parent permissions
        // The merge function will determine if it's inherited-only or overridden
        inheritedShares.push({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          permission: { level: permissionSource.level },
          // Serialize permissionSource to avoid circular references
          // For tooltip display, use immediate parent's title, not the ultimate source
          permissionSource: {
            level: permissionSource.level,
            source: "inherited", // Always mark as inherited since this is from parent chain
            sourceDocId: parentDoc.id, // Use immediate parent's ID
            sourceDocTitle: parentDoc.title, // Use immediate parent's title
            priority: permissionSource.priority,
          },
          type: "user" as const,
        });
      }
    }

    return inheritedShares;
  }

  // Get inherited group permissions from parent chain
  private async getInheritedGroupShares(docId: string, docContext: DocContext): Promise<GroupShareData[]> {
    if (!docContext.parentId) return []; // No parent, no inherited permissions

    // Fetch parent document context to resolve permissions from parent's perspective
    const parentDoc = await this.prismaService.doc.findUnique({
      where: { id: docContext.parentId },
      select: { id: true, title: true, parentId: true, workspaceId: true, subspaceId: true },
    });

    if (!parentDoc) return [];

    const parentContext: DocContext = {
      id: parentDoc.id,
      workspaceId: parentDoc.workspaceId,
      parentId: parentDoc.parentId,
      subspaceId: parentDoc.subspaceId,
    };

    // Walk up parent chain and collect all group permissions
    const ancestorPermissions = await this.getAncestorPermissions(docContext.parentId);

    // Get group permissions with sourceGroupId
    const groupPermissions = ancestorPermissions.filter((p) => p.sourceGroupId && p.inheritedFromType === PermissionInheritanceType.GROUP);

    const inheritedGroupShares: GroupShareData[] = [];
    const processedGroups = new Set<string>();

    // Use sourceGroupId to directly identify which groups granted permissions
    for (const perm of groupPermissions) {
      if (!perm.sourceGroupId) continue;
      if (processedGroups.has(perm.sourceGroupId)) continue;
      processedGroups.add(perm.sourceGroupId);

      // Get the permission level for this specific group by finding the permission record
      // with this sourceGroupId (this gives us the correct permission level for THIS group)
      const groupPermission = groupPermissions.find((p) => p.sourceGroupId === perm.sourceGroupId);

      if (groupPermission) {
        const group = await this.prismaService.memberGroup.findUnique({
          where: { id: perm.sourceGroupId },
          select: {
            id: true,
            name: true,
            description: true,
            _count: { select: { members: true } },
          },
        });

        if (group) {
          inheritedGroupShares.push({
            id: group.id,
            name: group.name,
            description: group.description,
            memberCount: group._count.members,
            permission: { level: groupPermission.permission },
            // Serialize permissionSource to avoid circular references
            // For tooltip display, use immediate parent's title, not the ultimate source
            permissionSource: {
              level: groupPermission.permission,
              source: "inherited", // Always mark as inherited since this is from parent chain
              sourceDocId: parentDoc.id, // Use immediate parent's ID
              sourceDocTitle: parentDoc.title, // Use immediate parent's title
              priority: groupPermission.priority,
            },
            type: "group" as const,
          });
        }
      }
    }

    return inheritedGroupShares;
  }

  // Merge direct and inherited shares (direct wins, but track if parent permission exists)
  private mergeDirectAndInherited<T extends ShareData>(direct: T[], inherited: T[]): T[] {
    const directMap = new Map(direct.map((s) => [s.id, s]));
    const merged = [...direct];

    // Add inherited shares that don't have direct overrides
    for (const inheritedShare of inherited) {
      const directShare = directMap.get(inheritedShare.id);

      if (!directShare) {
        // No direct permission, add inherited share
        merged.push(inheritedShare);
      } else {
        // User has BOTH direct and inherited - mark as override
        directShare.hasParentPermission = true;

        // Store parent permission source info for UI to show override tooltip
        // The sourceDocTitle should come from the inherited permission's source
        directShare.parentPermissionSource = {
          level: inheritedShare.permissionSource?.level,
          source: "inherited", // Parent permission is always inherited from ancestor
          sourceDocId: inheritedShare.permissionSource?.sourceDocId,
          sourceDocTitle: inheritedShare.permissionSource?.sourceDocTitle,
          priority: inheritedShare.permissionSource?.priority,
        };
      }
    }

    return merged;
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

    // Send websocket notification to the user whose access was revoked
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.ACCESS_REVOKED,
      workspaceId: doc.workspaceId,
      actorId: userId,
      data: {
        docId: id,
        revokedUserId: dto.targetUserId,
        revokedByUserId: userId,
      },
      timestamp: new Date().toISOString(),
    });

    return this.getDocumentCollaborators(id, userId);
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

    return this.getDocumentCollaborators(id, userId);
  }

  async updateSharePermission(id: string, userId: string, dto: UpdateSharePermissionDto) {
    const doc = await this.prismaService.doc.findFirst({
      where: { id, authorId: userId },
    });

    if (!doc) throw new NotFoundException("Document not found");

    if (dto.groupId) {
      // Update GROUP permission by re-sharing with updated permission level
      // This handles both creating new permissions and updating existing ones
      await this.shareDocument(userId, id, {
        workspaceId: doc.workspaceId,
        targetGroupIds: [dto.groupId],
        permission: dto.permission,
      });
    } else if (dto.userId) {
      // Update DIRECT user permission
      await this.prismaService.documentPermission.deleteMany({
        where: {
          docId: id,
          userId: dto.userId,
          inheritedFromType: PermissionInheritanceType.DIRECT,
        },
      });

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
    }

    return this.getDocumentCollaborators(id, userId);
  }
}
