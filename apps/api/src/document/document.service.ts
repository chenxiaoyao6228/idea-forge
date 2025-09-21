import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from "@nestjs/common";
import { CreateDocumentDto, DocumentPagerDto, UpdateDocumentDto, ShareDocumentDto } from "./document.dto";
import {
  NavigationNode,
  NavigationNodeType,
  PermissionListRequest,
  SourceType,
  ResourceType,
  UnifiedPermission,
  UpdateCoverDto,
  SharedWithMeResponse,
  PermissionLevel,
} from "@idea/contracts";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { presentDocument } from "./document.presenter";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { PermissionService } from "@/permission/permission.service";
import { EnhancedPermissionService } from "@/permission/enhanced-permission.service";
import { PermissionContextService } from "@/permission/permission-context.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionListRequestDto } from "@/permission/permission.dto";

@Injectable()
export class DocumentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly permissionService: PermissionService,
    private readonly enhancedPermissionService: EnhancedPermissionService,
    private readonly permissionContextService: PermissionContextService,
  ) {}

  async create(authorId: string, dto: CreateDocumentDto) {
    const doc = await this.prismaService.doc.create({
      data: {
        ...dto,
        authorId,
        createdById: authorId,
        lastModifiedById: authorId,
        publishedAt: new Date(),
      },
    });

    // Create direct OWNER permission for the document author
    await this.prismaService.unifiedPermission.create({
      data: {
        userId: authorId,
        resourceType: "DOCUMENT",
        resourceId: doc.id,
        permission: "OWNER",
        sourceType: "DIRECT",
        priority: 1,
        createdById: authorId,
      },
    });

    if (doc.parentId) {
      await this.copyUnifiedPermissionsFromAncestors(doc.id, doc.parentId);
    }

    if (doc.publishedAt && doc.subspaceId) {
      await this.updateSubspaceNavigationTree(doc.subspaceId, "add", doc);
    }

    // websocket event
    this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.DOCUMENT_CREATE,
      workspaceId: doc.workspaceId,
      actorId: doc.createdById.toString(),
      data: {
        documentId: doc.id,
        subspaceId: doc.subspaceId,
      },
      timestamp: new Date().toISOString(),
    });

    return presentDocument(doc, { isPublic: true });
  }

  async list(userId: string, dto: DocumentPagerDto) {
    const { parentId, page, limit, sortBy, sortOrder } = dto;

    if (!parentId) {
      throw new BadRequestException("parentId is required");
    }

    const doc = await this.prismaService.doc.findUnique({ where: { id: parentId } });
    if (!doc) throw new NotFoundException("Parent document not found");

    let hasAccess = doc.authorId === userId;

    if (!hasAccess && doc.workspaceId) {
      const workspace = await this.prismaService.workspace.findUnique({
        where: { id: doc.workspaceId },
        include: { members: true },
      });
      hasAccess = !!workspace?.members.some((m) => m.userId === userId);
    }

    if (!hasAccess) {
      const perm = await this.prismaService.unifiedPermission.findFirst({
        where: {
          userId,
          resourceType: "DOCUMENT",
          resourceId: parentId,
        },
      });
      hasAccess = !!perm && perm.permission !== PermissionLevel.NONE;
    }

    if (!hasAccess) throw new ForbiddenException("No access to this document");

    const validSortFields = ["archivedAt", "publishedAt", "deletedAt", "updatedAt", "createdAt"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const { data: items, pagination } = await (this.prismaService.doc as any).paginateWithApiFormat({
      where: { parentId },
      page,
      limit,
      orderBy: { [sortField]: sortOrder || "desc" },
    });

    const data = items.map((doc) => presentDocument(doc, { isPublic: false }));

    // Use batch permission context resolution for better performance with caching
    const docIds = items.map((doc) => doc.id);
    const batchPermissionContexts = await this.permissionContextService.getBatchPermissionContexts(userId, ResourceType.DOCUMENT, docIds);

    // Extract abilities from permission contexts
    const permissions: Record<string, Record<string, boolean>> = {};
    for (const doc of items) {
      const context = batchPermissionContexts[doc.id];
      permissions[doc.id] = context ? context.abilities : this.getDefaultAbilities();
    }

    return {
      pagination,
      data,
      permissions,
    };
  }

  async update(id: string, userId: string, dto: UpdateDocumentDto) {
    const data: any = { ...dto };
    data.lastModifiedById = userId;

    const updatedDoc = await this.prismaService.doc.update({
      where: { id },
      data,
    });

    const shouldUpdateStructure =
      updatedDoc.subspaceId && updatedDoc.publishedAt && !updatedDoc.archivedAt && (dto.title !== undefined || dto.icon !== undefined);

    if (shouldUpdateStructure) {
      await this.updateSubspaceNavigationTree(updatedDoc.subspaceId!, "update", updatedDoc);
    }

    // Fetch complete updated document with relations for WebSocket event
    const completeUpdatedDoc = await this.prismaService.doc.findUnique({
      where: { id },
      include: {
        author: true,
        workspace: true,
        subspace: true,
        coverImage: true,
        parent: true,
        children: true,
      },
    });

    if (completeUpdatedDoc) {
      // Publish WebSocket event for real-time synchronization
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.DOCUMENT_UPDATE,
        workspaceId: completeUpdatedDoc.workspaceId,
        actorId: userId,
        data: {
          document: presentDocument(completeUpdatedDoc, { isPublic: true }),
          subspaceId: completeUpdatedDoc.subspaceId || null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return updatedDoc;
  }

  async remove(id: string, userId: string) {
    const doc = await this.prismaService.doc.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    if (doc.subspaceId) {
      await this.updateSubspaceNavigationTree(doc.subspaceId, "remove", doc);
    }

    await this.prismaService.doc.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        lastModifiedById: userId,
      },
    });

    return { success: true };
  }

  async findOne(id: string, userId: string) {
    const document = await this.prismaService.doc.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            displayName: true,
            imageUrl: true,
          },
        },
        workspace: {
          select: {
            id: true,
            name: true,
            description: true,
            avatar: true,
          },
        },
        subspace: {
          select: {
            id: true,
            name: true,
            description: true,
            avatar: true,
          },
        },
        parent: {
          select: {
            id: true,
            title: true,
          },
        },
        children: {
          select: {
            id: true,
            title: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        coverImage: true,
        revisions: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
        },
        docShare: {
          where: {
            revokedAt: null,
          },
          include: {
            sharedTo: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Check basic visibility (simplified, no complex permissions yet)
    const isPublic = document.visibility === "PUBLIC";

    // Present document data (similar to presentDocument)
    const serializedDocument = presentDocument(document, { isPublic });

    const data = {
      document: serializedDocument,
      workspace: document.workspace,
    };

    // Get real permission context for the user using the cached service
    const permissionContext = await this.permissionContextService.getPermissionContext(userId, ResourceType.DOCUMENT, document.id);

    return {
      data,
      permissions: isPublic ? undefined : { [document.id]: permissionContext.abilities },
    };
  }

  private getDefaultAbilities() {
    return {
      read: false,
      update: false,
      delete: false,
      share: false,
      comment: false,
    };
  }

  private mapPermissionToAbilities(permission: PermissionLevel, isAuthor: boolean) {
    // Authors always have full permissions regardless of calculated permission
    if (isAuthor) {
      return {
        read: true,
        update: true,
        delete: true,
        share: true,
        comment: true,
      };
    }

    // Map permission levels to abilities
    switch (permission) {
      case PermissionLevel.OWNER:
      case PermissionLevel.MANAGE:
        return {
          read: true,
          update: true,
          delete: true,
          share: true,
          comment: true,
        };
      case PermissionLevel.EDIT:
        return {
          read: true,
          update: true,
          delete: false,
          share: false,
          comment: true,
        };
      case PermissionLevel.COMMENT:
        return {
          read: true,
          update: false,
          delete: false,
          share: false,
          comment: true,
        };
      case PermissionLevel.READ:
        return {
          read: true,
          update: false,
          delete: false,
          share: false,
          comment: false,
        };
      default:
        return this.getDefaultAbilities();
    }
  }

  private docToNavigationNode(doc: any): NavigationNode {
    return {
      id: doc.id,
      title: doc.title,
      url: `/${doc.id}`,
      icon: doc.icon,
      children: [],
      subspaceId: doc.subspaceId,
      type: NavigationNodeType.Document,
      parent: null,
    };
  }

  private async updateSubspaceNavigationTree(subspaceId: string, operation: "add" | "update" | "remove", doc: any) {
    const subspace = await this.prismaService.subspace.findUnique({
      where: { id: subspaceId },
    });

    if (!subspace) {
      return;
    }

    let navigationTree = (subspace.navigationTree as NavigationNode[]) || [];

    switch (operation) {
      case "add":
        navigationTree = this.addDocumentToTree(navigationTree, doc);
        break;
      case "update":
        navigationTree = this.updateDocumentInTree(navigationTree, doc);
        break;
      case "remove":
        navigationTree = this.removeDocumentFromTree(navigationTree, doc.id);
        break;
    }

    await this.prismaService.subspace.update({
      where: { id: subspaceId },
      data: {
        navigationTree: navigationTree,
      },
    });
  }

  private addDocumentToTree(tree: NavigationNode[], doc: any): NavigationNode[] {
    try {
      const docNode = this.docToNavigationNode(doc);

      if (!doc.parentId) {
        return [docNode, ...tree];
      }

      return tree.map((node) => {
        if (!node) {
          return node;
        }

        if (node.id === doc.parentId) {
          return {
            ...node,
            children: [docNode, ...(node.children || [])],
          };
        }

        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: this.addDocumentToTree(node.children, doc),
          };
        }
        return node;
      });
    } catch (error) {
      console.error("Error adding document to tree:", error);
      return tree;
    }
  }

  private updateDocumentInTree(tree: NavigationNode[], doc: any): NavigationNode[] {
    const updatedNode = this.docToNavigationNode(doc);

    return tree.map((node) => {
      if (node.id === doc.id) {
        return {
          ...updatedNode,
          children: node.children,
        };
      }

      if (node.children.length > 0) {
        return {
          ...node,
          children: this.updateDocumentInTree(node.children, doc),
        };
      }
      return node;
    });
  }

  private removeDocumentFromTree(tree: NavigationNode[], docId: string): NavigationNode[] {
    return tree
      .filter((node) => node.id !== docId)
      .map((node) => ({
        ...node,
        children: this.removeDocumentFromTree(node.children, docId),
      }));
  }

  // ================ internal share with permission ========================
  async shareDocument(userId: string, docId: string, dto: ShareDocumentDto) {
    // 1. Verify document exists
    const doc = await this.prismaService.doc.findUnique({ where: { id: docId } });
    if (!doc) throw new BadRequestException("Document not found");

    // 2. Base permission template
    const permissionBase: any = {
      resourceType: "DOCUMENT",
      resourceId: docId,
      permission: dto.permission,
      createdById: userId,
    };

    // 3. Track all created permissions with full data
    const createdPermissions: UnifiedPermission[] = [];

    // 4. Batch grant permissions to users
    if (dto.targetUserIds && dto.targetUserIds.length > 0) {
      for (const targetUserId of dto.targetUserIds) {
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
      const allChildren = await this.findAllDescendantDocuments(docId);
      for (const child of allChildren) {
        for (const parentPerm of createdPermissions) {
          const childPerm = await this.prismaService.unifiedPermission.create({
            data: {
              ...permissionBase,
              resourceId: child.id,
              userId: parentPerm.userId,
              sourceType: parentPerm.sourceType,
              priority: parentPerm.priority,
              sourceId: parentPerm.id,
            },
          });
          createdPermissions.push(childPerm);
        }
      }
    }

    // 7. Publish websocket event
    // Collect all affected user IDs
    const affectedUserIds = new Set<string>();
    for (const permission of createdPermissions) {
      if (permission.userId) {
        affectedUserIds.add(permission.userId);
      }
    }

    // For each affected user, publish a websocket event with their new abilities for this document
    for (const affectedUserId of affectedUserIds) {
      // Get abilities for the shared document for this user
      const userAbilities = await this.permissionService.getResourcePermissionAbilities("DOCUMENT", docId, affectedUserId);

      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.DOCUMENT_ADD_USER,
        workspaceId: doc.workspaceId,
        actorId: userId,
        data: {
          userId: affectedUserId,
          documentId: docId,
          document: doc,
          abilities: userAbilities,
          includeChildDocuments: dto.includeChildDocuments || false,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true };
  }

  async getSharedRootDocsWithMe(userId: string, query: PermissionListRequestDto): Promise<SharedWithMeResponse> {
    const { page = 1, limit = 10, workspaceId } = query;

    // Get all direct permissions for documents (excluding user's own docs)
    const directPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType: ResourceType.DOCUMENT,
        sourceType: { in: [SourceType.DIRECT, SourceType.GROUP] },
        sourceId: null,
        createdById: { not: userId },
      },
      orderBy: [{ resourceId: "asc" }, { priority: "asc" }],
    });

    // Get document IDs from permissions
    const docIds = directPermissions.map((perm) => perm.resourceId);

    // Filter documents by workspace if specified
    let filteredDocIds = docIds;
    if (workspaceId && docIds.length > 0) {
      const docsInWorkspace = await this.prismaService.doc.findMany({
        where: {
          id: { in: docIds },
          workspaceId,
        },
        select: { id: true },
      });
      filteredDocIds = docsInWorkspace.map((doc) => doc.id);
    }

    // Apply pagination to filtered document IDs
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDocIds = filteredDocIds.slice(startIndex, endIndex);

    // Get permissions for paginated documents
    const paginatedPermissions = directPermissions.filter((perm) => paginatedDocIds.includes(perm.resourceId));

    // For page 1, fetch all GROUP permissions (not paginated)
    let groupPermissions: UnifiedPermission[] = [];
    if (page === 1) {
      groupPermissions = await this.prismaService.unifiedPermission.findMany({
        where: {
          userId,
          resourceType: ResourceType.DOCUMENT,
          sourceType: SourceType.GROUP,
          createdById: { not: userId },
          resourceId: { in: filteredDocIds },
        },
        orderBy: [{ resourceId: "asc" }, { priority: "asc" }],
      });
    }

    // Merge permissions, deduplicate by resourceId, keep highest priority
    const allPermissions = [...paginatedPermissions, ...groupPermissions];
    const resolvedPermissions = new Map<string, UnifiedPermission>();
    for (const perm of allPermissions) {
      const existing = resolvedPermissions.get(perm.resourceId);
      if (!existing || perm.priority < existing.priority) {
        resolvedPermissions.set(perm.resourceId, perm);
      }
    }

    const finalDocIds = Array.from(resolvedPermissions.keys());

    // Fetch document details
    const documents = await this.prismaService.doc.findMany({
      where: { id: { in: finalDocIds } },
    });

    // Build permissions object
    const abilitiesObj: Record<string, any> = {};
    for (const docId of finalDocIds) {
      const ability = resolvedPermissions.get(docId);
      if (ability) {
        abilitiesObj[docId] = this.permissionService.mapDocPermissionLevelToAbilities(ability.permission);
      }
    }

    // Create pagination object
    const total = filteredDocIds.length;
    const pagination = {
      page,
      limit,
      total,
      pageCount: Math.ceil(total / limit),
    };

    return {
      pagination,
      data: { documents },
      abilities: abilitiesObj,
    };
  }

  // Recursively find all child/descendant documents
  private async findAllDescendantDocuments(parentId: string): Promise<any[]> {
    const children = await this.prismaService.doc.findMany({ where: { parentId } });
    let all: any[] = [];
    for (const child of children) {
      all.push(child);
      const subChildren = await this.findAllDescendantDocuments(child.id);
      all = all.concat(subChildren);
    }
    return all;
  }

  private async copyUnifiedPermissionsFromAncestors(documentId: string, parentDocumentId: string) {
    // Find all ancestor IDs
    const ancestorIds: string[] = [];
    let currentId: string | null = parentDocumentId;
    while (currentId) {
      ancestorIds.push(currentId);
      const parent = await this.prismaService.doc.findUnique({ where: { id: currentId }, select: { parentId: true } });
      currentId = parent?.parentId;
    }

    // Get all direct permissions in one query
    const parentPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType: "DOCUMENT",
        resourceId: { in: ancestorIds },
        sourceId: null,
      },
    });

    // Bulk insert permissions
    await this.prismaService.unifiedPermission.createMany({
      data: parentPermissions.map((permission) => ({
        userId: permission.userId,
        resourceType: "DOCUMENT",
        resourceId: documentId,
        permission: permission.permission,
        sourceType: permission.sourceType,
        sourceId: permission.id,
        priority: permission.priority,
        createdById: permission.createdById,
      })),
    });
  }

  // ================ public share ========================
  //TODO:

  async updateCover(docId: string, userId: string, dto: UpdateCoverDto) {
    // 1. verify doc and cover exist
    const doc = await this.prismaService.doc.findFirst({
      where: { id: docId },
      include: { coverImage: true },
    });
    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    let coverResult: any;
    // 2. if no cover, create new cover
    if (!doc.coverImage) {
      if (!dto.url) throw new BadRequestException("URL is required for new cover");
      coverResult = await this.prismaService.coverImage.create({
        data: {
          url: dto.url,
          scrollY: dto.scrollY || 0,
          docId: docId,
          isPreset: dto.isPreset || false,
        },
      });
    } else {
      // 3. update existing cover
      coverResult = await this.prismaService.coverImage.update({
        where: { docId },
        data: {
          ...(dto.url && { url: dto.url }),
          ...(dto.scrollY !== undefined && { scrollY: dto.scrollY }),
          ...(dto.isPreset !== undefined && { isPreset: dto.isPreset }),
        },
      });
    }

    // 4. Fetch complete updated document with relations for WebSocket event
    const updatedDoc = await this.prismaService.doc.findUnique({
      where: { id: docId },
      include: {
        author: true,
        workspace: true,
        subspace: true,
        coverImage: true,
        parent: true,
        children: true,
      },
    });

    if (updatedDoc) {
      // 5. Publish WebSocket event for real-time synchronization
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.DOCUMENT_UPDATE,
        workspaceId: updatedDoc.workspaceId,
        actorId: userId,
        data: {
          document: presentDocument(updatedDoc, { isPublic: true }),
          subspaceId: updatedDoc.subspaceId || null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return coverResult;
  }

  async removeCover(docId: string, userId: string) {
    // 1. verify doc and cover exist
    const doc = await this.prismaService.doc.findFirst({
      where: { id: docId, authorId: userId },
      include: { coverImage: true },
    });
    if (!doc || !doc.coverImage) throw new ApiException(ErrorCodeEnum.DocumentCoverNotFound);

    // 2. delete cover
    const deleteResult = await this.prismaService.coverImage.delete({
      where: { docId },
    });

    // 3. Fetch complete updated document with relations for WebSocket event
    const updatedDoc = await this.prismaService.doc.findUnique({
      where: { id: docId },
      include: {
        author: true,
        workspace: true,
        subspace: true,
        coverImage: true,
        parent: true,
        children: true,
      },
    });

    if (updatedDoc) {
      // 4. Publish WebSocket event for real-time synchronization
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.DOCUMENT_UPDATE,
        workspaceId: updatedDoc.workspaceId,
        actorId: userId,
        data: {
          document: presentDocument(updatedDoc, { isPublic: true }),
          subspaceId: updatedDoc.subspaceId || null,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return deleteResult;
  }

  async duplicate(userId: string, id: string) {
    // Find original document with children
    const originalDoc = await this.prismaService.doc.findFirst({
      where: {
        id,
        authorId: userId,
        archivedAt: null,
      },
      include: {
        coverImage: true,
        children: {
          where: { archivedAt: null },
          include: {
            coverImage: true,
          },
        },
      },
    });
    if (!originalDoc) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }
    // Get siblings to calculate position
    const siblings = await this.prismaService.doc.findMany({
      where: {
        parentId: originalDoc.parentId,
        authorId: userId,
        archivedAt: null,
      },
      orderBy: { createdAt: "asc" },
      take: 1,
    });
    // Create duplicate document
    const duplicatedDoc = await this.prismaService.doc.create({
      data: {
        title: `${originalDoc.title} (copy)`,
        // FIXME: the content is not sync with the contentBinary
        content: originalDoc.content,
        contentBinary: originalDoc.contentBinary,
        authorId: userId,
        createdById: userId,
        lastModifiedById: userId,
        workspaceId: originalDoc.workspaceId,
        parentId: originalDoc.parentId,
        archivedAt: null,
      },
    });
    // Duplicate cover image if exists
    if (originalDoc.coverImage) {
      await this.prismaService.coverImage.create({
        data: {
          docId: duplicatedDoc.id,
          url: originalDoc.coverImage.url,
          scrollY: originalDoc.coverImage.scrollY,
          isPreset: originalDoc.coverImage.isPreset,
        },
      });
    }
    // Recursively duplicate children
    if (originalDoc.children.length > 0) {
      await this.duplicateChildren(originalDoc.children, duplicatedDoc.id, userId);
    }
    return {
      ...duplicatedDoc,
      isLeaf: originalDoc.children.length === 0,
      icon: duplicatedDoc.icon,
    };
  }

  private async duplicateChildren(children: any[], newParentId: string, userId: string) {
    for (const child of children) {
      // Create duplicate of child
      const duplicatedChild = await this.prismaService.doc.create({
        data: {
          title: child.title,
          content: child.content,
          contentBinary: child.contentBinary,
          authorId: userId,
          parentId: newParentId,
          archivedAt: null,
          createdById: userId,
          lastModifiedById: userId,
          workspaceId: child.workspaceId,
          subspaceId: child.subspaceId,
        },
      });
      // Duplicate child's cover image if exists
      if (child.coverImage) {
        await this.prismaService.coverImage.create({
          data: {
            docId: duplicatedChild.id,
            url: child.coverImage.url,
            scrollY: child.coverImage.scrollY,
            isPreset: child.coverImage.isPreset,
          },
        });
      }

      const grandchildren = await this.prismaService.doc.findMany({
        where: {
          parentId: child.id,
          archivedAt: null,
        },
        include: {
          coverImage: true,
        },
      });
      if (grandchildren.length > 0) {
        await this.duplicateChildren(grandchildren, duplicatedChild.id, userId);
      }
    }
  }

  /**
   * List documents with resolved permissions for the current user
   */
  async listDocumentsWithPermissions(userId: string, filter: any = {}) {
    const docs = await this.prismaService.doc.findMany({
      where: filter,
    });
    const permissions = await this.permissionService.batchResolveUserPermissionsForDocuments(
      userId,
      docs.map((doc) => ({ id: doc.id, subspaceId: doc.subspaceId, workspaceId: doc.workspaceId })),
    );
    return {
      documents: docs,
      permissions,
    };
  }
}
