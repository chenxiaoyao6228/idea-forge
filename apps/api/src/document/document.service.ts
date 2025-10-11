import { Injectable, ForbiddenException, BadRequestException, NotFoundException } from "@nestjs/common";
import { CreateDocumentDto, DocumentPagerDto, UpdateDocumentDto, ShareDocumentDto } from "./document.dto";
import { NavigationNode, NavigationNodeType, UpdateCoverDto, PermissionLevel, UpdateDocumentSubspacePermissionsDto, DocumentPermission } from "@idea/contracts";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { presentDocument } from "./document.presenter";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { AbilityService } from "@/_shared/casl/casl.service";
import { DocPermissionResolveService } from "@/permission/document-permission.service";

@Injectable()
export class DocumentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly abilityService: AbilityService,
    private readonly docPermissionResolveService: DocPermissionResolveService,
  ) {}

  async create(authorId: string, dto: CreateDocumentDto) {
    // Determine publishedAt based on subspace type
    let publishedAt: Date | null = new Date();

    if (dto.subspaceId) {
      const subspace = await this.prismaService.subspace.findUnique({
        where: { id: dto.subspaceId },
        select: { type: true },
      });

      // Documents in personal subspace start as drafts (publishedAt = null)
      if (subspace?.type === "PERSONAL") {
        publishedAt = null;
      }
    }

    const doc = await this.prismaService.doc.create({
      data: {
        ...dto,
        authorId,
        createdById: authorId,
        lastModifiedById: authorId,
        publishedAt,
      },
    });

    // Create direct OWNER permission for the document author
    // ONLY if they don't already have MANAGE permission through parent inheritance
    let shouldCreatePermission = true;

    if (doc.parentId) {
      // Check if author would inherit MANAGE from parent
      const parentPermission = await this.docPermissionResolveService.resolveUserPermissionForDocument(
        authorId,
        { id: doc.parentId, workspaceId: doc.workspaceId, subspaceId: doc.subspaceId }
      );

      // If author already has MANAGE on parent (either direct or inherited), don't create redundant permission
      if (parentPermission.level === "MANAGE") {
        shouldCreatePermission = false;
      }
    }

    if (shouldCreatePermission) {
      await this.prismaService.documentPermission.create({
        data: {
          userId: authorId,
          docId: doc.id,
          permission: "MANAGE",
          inheritedFromType: "DIRECT",
          priority: 1,
          createdById: authorId,
        },
      });
    }

    if (doc.subspaceId) {
      await this.updateSubspaceNavigationTree(doc.subspaceId, "add", doc);
    }

    // websocket event
    this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.DOCUMENT_CREATE,
      workspaceId: doc.workspaceId,
      actorId: doc.createdById.toString(),
      data: {
        docId: doc.id,
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

    // TODO: check if user has access to this document, with casl permission check

    const validSortFields = ["archivedAt", "publishedAt", "deletedAt", "updatedAt", "createdAt"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const { data: items, pagination } = await (this.prismaService.doc as any).paginateWithApiFormat({
      where: { parentId },
      page,
      limit,
      orderBy: { [sortField]: sortOrder || "desc" },
    });

    const data = items.map((doc) => presentDocument(doc, { isPublic: false }));

    return {
      pagination,
      data,
      permissions: {},
    };
  }

  async update(id: string, userId: string, dto: UpdateDocumentDto) {
    const data: any = { ...dto };
    data.lastModifiedById = userId;

    const updatedDoc = await this.prismaService.doc.update({
      where: { id },
      data,
    });

    const shouldUpdateStructure = updatedDoc.subspaceId && !updatedDoc.archivedAt && (dto.title !== undefined || dto.icon !== undefined);

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
    // TODO: don't need that much include
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
            type: true,
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
            workspaceId: true,
            parentId: true,
            subspaceId: true,
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
      },
    });

    if (!document) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Filter children based on user permissions
    const accessibleChildren: { id: string; title: string }[] = [];
    for (const child of document.children) {
      const childPermission = await this.docPermissionResolveService.resolveUserPermissionForDocument(userId, {
        id: child.id,
        workspaceId: child.workspaceId,
        parentId: child.parentId,
        subspaceId: child.subspaceId,
      });

      // Only include children that the user has at least VIEW permission for
      if (childPermission.level !== PermissionLevel.NONE) {
        accessibleChildren.push({
          id: child.id,
          title: child.title,
        });
      }
    }

    // Replace children with filtered list
    const documentWithFilteredChildren = {
      ...document,
      children: accessibleChildren,
    };

    // Check basic visibility (simplified, no complex permissions yet)
    const isPublic = document.visibility === "PUBLIC";

    // Present document data (similar to presentDocument)
    const doc = presentDocument(documentWithFilteredChildren, { isPublic });

    // Get and serialize document abilities for the user scoped to this document
    const serializedAbility = await this.abilityService.serializeAbilityForUser(
      "Doc",
      { id: userId },
      {
        doc: {
          id: document.id,
          workspaceId: document.workspaceId,
          parentId: document.parentId,
          subspaceId: document.subspaceId,
          authorId: document.authorId,
          publishedAt: document.publishedAt,
        },
      },
    );

    // FIXME:  we have already called the resolveUserPermissionForDocument in serializeAbilityForUser-> document.ability.ts, need optimization
    // Get permission source metadata for the user
    const permissionSource = await this.docPermissionResolveService.resolveUserPermissionForDocument(userId, {
      id: document.id,
      workspaceId: document.workspaceId,
      parentId: document.parentId,
      subspaceId: document.subspaceId,
    });

    return {
      doc,
      permissions: {
        Doc: serializedAbility,
      },
      permissionSource, // NEW: Include permission source metadata
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
    // 1. Verify document exists
    const doc = await this.prismaService.doc.findUnique({ where: { id: docId } });
    if (!doc) throw new BadRequestException("Document not found");

    // 2. Base permission template
    const permissionBase: any = {
      docId: docId,
      permission: dto.permission,
      createdById: userId,
    };

    // 3. Track all created permissions with full data
    const createdPermissions: DocumentPermission[] = [];

    // 4. Batch grant permissions to users
    if (dto.targetUserIds && dto.targetUserIds.length > 0) {
      for (const targetUserId of dto.targetUserIds) {
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
          const perm = await this.prismaService.documentPermission.create({
            data: {
              ...permissionBase,
              userId: member.userId,
              inheritedFromType: "GROUP",
              priority: 2,
              inheritedFromId: null,
            },
          });
          createdPermissions.push(perm);
        }
      }
    }

    // 6. Publish websocket event - simplified version
    // Collect all affected user IDs
    const affectedUserIds = new Set<string>();
    for (const permission of createdPermissions) {
      if (permission.userId) {
        affectedUserIds.add(permission.userId);
      }
    }

    // Send simple notification to each affected user
    for (const affectedUserId of affectedUserIds) {
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.DOCUMENT_ADD_USER,
        workspaceId: doc.workspaceId,
        actorId: userId,
        data: {
          userId: affectedUserId,
          docId: docId,
          document: doc,
          includeChildDocuments: dto.includeChildDocuments || false,
        },
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true };
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

  async updateSubspacePermissions(id: string, userId: string, dto: UpdateDocumentSubspacePermissionsDto) {
    // Verify document exists and user has permission
    const doc = await this.prismaService.doc.findUnique({
      where: { id },
      select: { id: true, authorId: true, subspaceId: true },
    });

    if (!doc) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Check if user is the author or has manage permission
    if (doc.authorId !== userId) {
      // TODO: Add permission check for subspace admins
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Update the document with new subspace permission overrides
    const updatedDoc = await this.prismaService.doc.update({
      where: { id },
      data: {
        ...dto,
        lastModifiedById: userId,
      },
    });

    return updatedDoc;
  }
}
