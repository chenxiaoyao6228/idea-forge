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
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

@Injectable()
export class DocumentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly permissionService: PermissionService,
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

    // Generate permissions for each doc
    const permissions: Record<string, Record<string, boolean>> = {};
    for (const doc of items) {
      const abilities = await this.permissionService.getResourcePermissionAbilities("DOCUMENT", doc.id, userId);
      permissions[doc.id] = abilities as Record<string, boolean>;
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

    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.DOCUMENT_UPDATE,
      workspaceId: updatedDoc.workspaceId,
      actorId: updatedDoc.lastModifiedById.toString(),
      data: {
        document: presentDocument(updatedDoc, { isPublic: true }),
        subspaceId: updatedDoc.subspaceId || null,
      },
      timestamp: new Date().toISOString(),
    });

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
      // Include shared tree if document is shared
      sharedTree: document.docShare?.some((share) => share.includeChildDocuments) ? await this.getSharedTree(document.id) : null,
    };

    return {
      data,
      // Placeholder for permissions
      permissions: isPublic ? undefined : this.presentPoliciesPlaceholder(userId, document),
    };
  }

  // FIXME: remove ?
  private async getSharedTree(documentId: string): Promise<NavigationNode[]> {
    const document = await this.prismaService.doc.findUnique({
      where: { id: documentId },
      include: {
        children: {
          where: {
            archivedAt: null,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!document) {
      return [];
    }

    return document.children.map((child) => this.docToNavigationNode(child));
  }

  private presentPoliciesPlaceholder(userId: string, document: any) {
    // Placeholder for permissions
    return {
      [document.id]: {
        read: true,
        update: document.authorId === userId,
        delete: document.authorId === userId,
        share: document.authorId === userId,
      },
    };
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
    // 1. 校验文档存在
    const doc = await this.prismaService.doc.findUnique({ where: { id: docId } });
    if (!doc) throw new BadRequestException("Document not found");

    // 2. 权限数据模板
    const permissionBase: any = {
      resourceType: "DOCUMENT",
      resourceId: docId,
      permission: dto.permission,
      createdById: userId,
    };

    // 3. 记录所有创建的父权限，便于子文档继承
    const parentPermissions: { id: string; userId?: string; groupId?: string }[] = [];

    // 4. 批量为用户授权
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
        parentPermissions.push({ id: perm.id, userId: targetUserId });
      }
    }

    // 5. 批量为群组授权
    if (dto.targetGroupIds && dto.targetGroupIds.length > 0) {
      for (const targetGroupId of dto.targetGroupIds) {
        const perm = await this.prismaService.unifiedPermission.create({
          data: {
            ...permissionBase,
            groupId: targetGroupId,
            sourceType: "GROUP",
            priority: 2,
            sourceId: null,
          },
        });
        parentPermissions.push({ id: perm.id, groupId: targetGroupId });
      }
    }

    // 6. 子文档继承
    if (dto.includeChildDocuments) {
      // 递归查找所有子文档
      const allChildren = await this.findAllDescendantDocuments(docId);
      for (const child of allChildren) {
        // 为每个 parentPermission 创建继承权限
        for (const parentPerm of parentPermissions) {
          await this.prismaService.unifiedPermission.create({
            data: {
              ...permissionBase,
              resourceId: child.id,
              userId: parentPerm.userId,
              groupId: parentPerm.groupId,
              sourceType: parentPerm.groupId ? "GROUP" : "DIRECT",
              priority: parentPerm.groupId ? 2 : 1,
              sourceId: parentPerm.id,
            },
          });
        }
      }
    }
    return { success: true };
  }

  async getSharedRootDocsWithMe(userId: string, query: PermissionListRequest): Promise<SharedWithMeResponse> {
    const { page = 1, limit = 10 } = query;

    // 1. Paginate DIRECT permissions (excluding user's own docs)
    const { data: directPermissions, pagination } = await (this.prismaService.unifiedPermission as any).paginateWithApiFormat({
      where: {
        userId,
        resourceType: ResourceType.DOCUMENT,
        sourceType: SourceType.DIRECT,
        sourceId: null,
        createdById: { not: userId },
      },
      orderBy: [{ resourceId: "asc" }, { priority: "asc" }],
      page,
      limit,
    });

    // 2. For page 1, fetch all GROUP permissions (not paginated)
    let groupPermissions: UnifiedPermission[] = [];
    if (page === 1) {
      groupPermissions = await this.prismaService.unifiedPermission.findMany({
        where: {
          userId,
          resourceType: ResourceType.DOCUMENT,
          sourceType: SourceType.GROUP,
          createdById: { not: userId },
        },
        orderBy: [{ resourceId: "asc" }, { priority: "asc" }],
      });
    }

    // 3. Merge permissions, deduplicate by resourceId, keep highest priority
    const allPermissions = [...directPermissions, ...groupPermissions];
    const resolvedPermissions = new Map<string, UnifiedPermission>();
    for (const perm of allPermissions) {
      const existing = resolvedPermissions.get(perm.resourceId);
      if (!existing || perm.priority < existing.priority) {
        resolvedPermissions.set(perm.resourceId, perm);
      }
    }

    const docIds = Array.from(resolvedPermissions.keys());

    // 4. Fetch document details
    const documents = await this.prismaService.doc.findMany({
      where: { id: { in: docIds } },
    });

    // 5. Build permissions object
    const permissionsObj: Record<string, any> = {};
    for (const docId of docIds) {
      const perm = resolvedPermissions.get(docId);
      if (perm) {
        permissionsObj[docId] = this.permissionService.mapDocPermissionLevelToAbilities(perm.permission);
      }
    }

    return {
      pagination,
      data: { documents },
      permissions: permissionsObj,
    };
  }

  // 递归查找所有子/孙文档
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
    // 1. 查出所有祖先ID
    const ancestorIds: string[] = [];
    let currentId: string | null = parentDocumentId;
    while (currentId) {
      ancestorIds.push(currentId);
      const parent = await this.prismaService.doc.findUnique({ where: { id: currentId }, select: { parentId: true } });
      currentId = parent?.parentId;
    }

    // 2. 一次性查出所有直接权限
    const parentPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType: "DOCUMENT",
        resourceId: { in: ancestorIds },
        sourceId: null,
      },
    });

    // 3. 批量插入
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
      where: { id: docId, authorId: userId },
      include: { coverImage: true },
    });
    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);

    // 2. if no cover, create new cover
    if (!doc.coverImage) {
      if (!dto.url) throw new BadRequestException("URL is required for new cover");
      return this.prismaService.coverImage.create({
        data: {
          url: dto.url,
          scrollY: dto.scrollY || 0,
          docId: docId,
          isPreset: dto.isPreset || false,
        },
      });
    }

    // 3. update existing cover
    return this.prismaService.coverImage.update({
      where: { docId },
      data: {
        ...(dto.url && { url: dto.url }),
        ...(dto.scrollY !== undefined && { scrollY: dto.scrollY }),
        ...(dto.isPreset !== undefined && { isPreset: dto.isPreset }),
      },
    });
  }

  async removeCover(docId: string, userId: string) {
    // 1. verify doc and cover exist
    const doc = await this.prismaService.doc.findFirst({
      where: { id: docId, authorId: userId },
      include: { coverImage: true },
    });
    if (!doc || !doc.coverImage) throw new ApiException(ErrorCodeEnum.DocumentCoverNotFound);

    // 2. delete cover
    return await this.prismaService.coverImage.delete({
      where: { docId },
    });
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
