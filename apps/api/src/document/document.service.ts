import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { CreateDocumentDto, DocumentPagerDto, UpdateDocumentDto, ShareDocumentDto } from "./document.dto";
import { NavigationNode, NavigationNodeType, UpdateCoverDto } from "@idea/contracts";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { presentDocument } from "./document.presenter";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { DocShareService } from "../doc-share/doc-share.service";
import { PermissionService } from "@/permission/permission.service";
import { generateFractionalIndex, handleIndexCollision } from "@/_shared/utils/fractional-index";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

@Injectable()
export class DocumentService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly docShareService: DocShareService,
    private readonly permissionService: PermissionService,
  ) {}

  async create(authorId: string, dto: CreateDocumentDto) {
    // Get the first document's index to generate new index
    const firstDocument = await this.prismaService.doc.findFirst({
      where: {
        workspaceId: dto.workspaceId,
        subspaceId: dto.subspaceId,
        parentId: dto.parentId,
        index: { not: null }, // Only include documents with index set
      },
      orderBy: {
        index: "asc", // This will sort lexicographically which works for fractional indices
      },
    });

    // Generate new index and handle collisions using shared utilities
    const newIndex = generateFractionalIndex(null, firstDocument?.index ?? null);
    const documents = await this.prismaService.doc.findMany({
      where: {
        workspaceId: dto.workspaceId,
        subspaceId: dto.subspaceId,
        parentId: dto.parentId,
      },
      select: { index: true },
    });
    const finalIndex = handleIndexCollision(documents, newIndex);

    const doc = await this.prismaService.doc.create({
      data: {
        ...dto,
        authorId,
        createdById: authorId,
        lastModifiedById: authorId,
        publishedAt: new Date(),
        index: finalIndex, // Set the calculated fractional index
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
      await this.copyUnifiedPermissionsFromParent(doc.id, doc.parentId);
    }

    if (doc.subspaceId) {
      await this.permissionService.propagateDocumentPermissionsToExistingMembers(doc.id, doc.subspaceId, doc.workspaceId);
    }

    if (doc.publishedAt && doc.subspaceId) {
      await this.updateSubspaceNavigationTree(doc.subspaceId, "add", doc);
    }

    // Emit entities event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.ENTITIES,
      workspaceId: doc.workspaceId,
      actorId: doc.createdById.toString(),
      data: {
        event: BusinessEvents.DOCUMENT_CREATE,
        fetchIfMissing: true,
        documentIds: [
          {
            id: doc.id,
            updatedAt: doc.updatedAt.toISOString(),
          },
        ],
        subspaceIds: doc.subspaceId
          ? [
              {
                id: doc.subspaceId,
                updatedAt: doc.updatedAt.toISOString(),
              },
            ]
          : [],
      },
      timestamp: new Date().toISOString(),
    });

    return presentDocument(doc, { isPublic: true });
  }

  async list(userId: string, dto: DocumentPagerDto) {
    const { archivedAt, subspaceId, parentId, page, limit, sortBy, sortOrder } = dto;

    const where: any = {
      // TODO: 这个查的时候是不是要加permission的限制条件?
      AND: [
        archivedAt ? { archivedAt: { not: null } } : { archivedAt: null },
        subspaceId === null ? { subspaceId: null, authorId: userId } : {},
        subspaceId ? { subspaceId } : {},
        parentId === "null" ? { parentId: null } : parentId ? { parentId } : {},
        {
          OR: [
            { authorId: userId },
            {
              docShare: {
                some: {
                  userId,
                  revokedAt: null,
                },
              },
            },
            {
              workspace: {
                members: {
                  some: { userId },
                },
              },
            },
          ],
        },
      ],
    };

    const [items, total] = await Promise.all([
      this.prismaService.doc.findMany({
        where,
        orderBy: { [sortBy || "createdAt"]: sortOrder || "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              children: {
                where: { archivedAt: null },
              },
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
      }),
      this.prismaService.doc.count({ where }),
    ]);

    const data = items.map((doc) => ({
      id: doc.id,
      title: doc.title || "",
      index: doc.index || null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      isArchived: !!doc.archivedAt,
      isPublished: !!doc.publishedAt,
      isLeaf: doc._count.children === 0,
      parentId: doc.parentId || null,
      icon: doc.icon || null,
      visibility: doc.visibility || "WORKSPACE",
      workspaceId: doc.workspaceId || null,
      subspaceId: doc.subspaceId || null,
      shares: doc.docShare.map((share) => ({
        id: share.id,
        userId: share.userId,
        includeChildDocuments: share.includeChildDocuments,
        published: share.published,
        createdAt: share.createdAt,
        sharedTo: share.sharedTo,
      })),
    }));

    // Generate permissions for each doc
    const permissions: Record<string, Record<string, boolean>> = {};
    for (const doc of items) {
      const abilities = await this.permissionService.getResourcePermissionAbilities("DOCUMENT", doc.id, userId);
      permissions[doc.id] = abilities as Record<string, boolean>;
    }

    return {
      pagination: { page, limit, total },
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
            index: true,
          },
          orderBy: {
            index: "asc",
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

  private async getSharedTree(documentId: string): Promise<NavigationNode[]> {
    const document = await this.prismaService.doc.findUnique({
      where: { id: documentId },
      include: {
        children: {
          where: {
            archivedAt: null,
          },
          orderBy: {
            index: "asc",
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

  // ================ public share ========================

  async shareDocument(userId: string, docId: string, dto: ShareDocumentDto) {
    // Check if document exists
    const doc = await this.prismaService.doc.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    // Check if user has permission to share the document
    if (doc.authorId !== userId) {
      throw new Error("You don't have permission to share this document");
    }

    // Call DocShareService to create share
    return this.docShareService.createShare(userId, {
      documentId: docId,
      published: dto.published,
      urlId: dto.urlId,
      includeChildDocuments: dto.includeChildDocuments,
    });
  }

  async listDocShares(docId: string) {
    // Get all share information for the document
    const shares = await this.prismaService.docShare.findMany({
      where: {
        docId: docId,
        revokedAt: null, // Only get non-revoked shares
      },
      include: {
        author: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
        sharedTo: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return {
      data: {
        shares,
      },
    };
  }

  private async copyUnifiedPermissionsFromParent(documentId: string, parentDocumentId: string) {
    const parentPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType: "DOCUMENT",
        resourceId: parentDocumentId,
      },
    });

    for (const permission of parentPermissions) {
      await this.prismaService.unifiedPermission.create({
        data: {
          userId: permission.userId,
          guestId: permission.guestId,
          resourceType: "DOCUMENT",
          resourceId: documentId,
          permission: permission.permission,
          sourceType: permission.sourceType,
          sourceId: permission.sourceId ?? permission.id, // Maintain inheritance chain
          priority: permission.priority,
          createdById: permission.createdById,
        },
      });
    }
  }

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
      orderBy: { index: "desc" },
      take: 1,
    });
    const newIndex = generateFractionalIndex(null, siblings[0]?.index ?? null);
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
        index: newIndex,
        icon: originalDoc.icon,
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
          index: child.index,
          icon: child.icon,
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
}
