import { Injectable, Inject } from "@nestjs/common";
import { CreateDocumentDto, DocumentPagerDto, UpdateDocumentDto, ShareDocumentDto } from "./document.dto";
import { NavigationNode, NavigationNodeType, Permission } from "contracts";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { presentDocument } from "./document.presenter";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { DocShareService } from "../doc-share/doc-share.service";

@Injectable()
export class DocumentService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    private readonly eventPublisher: EventPublisherService,
    private readonly docShareService: DocShareService,
  ) {}

  async findOne(id: string, userId: number) {
    const document = await this.prisma.doc.findUnique({
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
            position: true,
          },
          orderBy: {
            position: "asc",
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
      // Placeholder for policies
      policies: isPublic ? undefined : this.presentPoliciesPlaceholder(userId, document),
    };
  }

  private async getSharedTree(documentId: string): Promise<NavigationNode[]> {
    const document = await this.prisma.doc.findUnique({
      where: { id: documentId },
      include: {
        children: {
          where: {
            archivedAt: null,
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });

    if (!document) {
      return [];
    }

    return document.children.map((child) => this.docToNavigationNode(child));
  }

  private presentPoliciesPlaceholder(userId: number, document: any) {
    // Placeholder for policies
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

  async create(authorId: number, dto: CreateDocumentDto) {
    const doc = await this.prisma.doc.create({
      data: {
        ...dto,
        authorId,
        publishedAt: new Date(),
      },
    });

    if (doc.publishedAt && doc.subspaceId) {
      await this.updateSubspaceNavigationTree(doc.subspaceId, "add", doc);
    }

    // Emit entities event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.ENTITIES,
      workspaceId: doc.workspaceId,
      actorId: authorId.toString(),
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

  async update(id: string, userId: number, dto: UpdateDocumentDto) {
    const data: any = { ...dto };

    const updatedDoc = await this.prisma.doc.update({
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
      actorId: userId.toString(),
      data: {
        document: presentDocument(updatedDoc, { isPublic: true }),
        subspaceId: updatedDoc.subspaceId || null,
      },
      timestamp: new Date().toISOString(),
    });

    return updatedDoc;
  }

  async remove(id: string, userId: number) {
    const doc = await this.prisma.doc.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    if (doc.subspaceId) {
      await this.updateSubspaceNavigationTree(doc.subspaceId, "remove", doc);
    }

    await this.prisma.doc.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    return { success: true };
  }

  private async updateSubspaceNavigationTree(subspaceId: string, operation: "add" | "update" | "remove", doc: any) {
    const subspace = await this.prisma.subspace.findUnique({
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

    await this.prisma.subspace.update({
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

  async list(userId: number, dto: DocumentPagerDto) {
    const { archivedAt, subspaceId, parentId, page, limit, sortBy, sortOrder } = dto;

    const where: any = {
      AND: [
        archivedAt ? { archivedAt: { not: null } } : { archivedAt: null },
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
      this.prisma.doc.findMany({
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
      this.prisma.doc.count({ where }),
    ]);

    const data = items.map((doc) => ({
      id: doc.id,
      title: doc.title || "",
      position: doc.position || 0,
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

    return {
      pagination: { page, limit, total },
      data,
      policies: {},
    };
  }

  async shareDocument(userId: number, docId: string, dto: ShareDocumentDto) {
    // 检查文档是否存在
    const doc = await this.prisma.doc.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      throw new Error("Document not found");
    }

    // 检查用户是否有权限分享文档
    if (doc.authorId !== userId) {
      throw new Error("You don't have permission to share this document");
    }

    // 调用 DocShareService 创建分享
    return this.docShareService.createShare(userId, {
      documentId: docId,
      published: dto.published,
      urlId: dto.urlId,
      includeChildDocuments: dto.includeChildDocuments,
    });
  }

  async listDocShares(docId: string) {
    // 获取文档的所有分享信息
    const shares = await this.prisma.docShare.findMany({
      where: {
        docId: docId,
        revokedAt: null, // 只获取未撤销的分享
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

  async addUserPermission(userId: number, docId: string, targetUserId: number, permission: Permission) {
    const doc = await this.prisma.doc.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Check if the user has permission to manage document permissions
    if (doc.authorId !== userId) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Check if target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    // Create or update user permission
    const userPermission = await this.prisma.docUserPermission.upsert({
      where: {
        docId_userId: {
          docId: docId,
          userId: targetUserId,
        },
      },
      update: {
        permission,
      },
      create: {
        docId: docId,
        userId: targetUserId,
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
      },
    });

    return userPermission;
  }

  async removeUserPermission(userId: number, docId: string, targetUserId: number) {
    const doc = await this.prisma.doc.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Check if the user has permission to manage document permissions
    if (doc.authorId !== userId) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    await this.prisma.docUserPermission.delete({
      where: {
        docId_userId: {
          docId: docId,
          userId: targetUserId,
        },
      },
    });

    return { success: true };
  }

  async addGroupPermission(userId: number, docId: string, groupId: string, permission: Permission) {
    const doc = await this.prisma.doc.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Check if the user has permission to manage document permissions
    if (doc.authorId !== userId) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    // Check if group exists
    const group = await this.prisma.memberGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new ApiException(ErrorCodeEnum.GroupNotFound);
    }

    // Create or update group permission
    const groupPermission = await this.prisma.docGroupPermission.upsert({
      where: {
        docId_groupId: {
          docId: docId,
          groupId,
        },
      },
      update: {
        permission,
      },
      create: {
        docId: docId,
        groupId,
        permission,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return groupPermission;
  }

  async removeGroupPermission(userId: number, docId: string, groupId: string) {
    const doc = await this.prisma.doc.findUnique({
      where: { id: docId },
    });

    if (!doc) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    // Check if the user has permission to manage document permissions
    if (doc.authorId !== userId) {
      throw new ApiException(ErrorCodeEnum.PermissionDenied);
    }

    await this.prisma.docGroupPermission.delete({
      where: {
        docId_groupId: {
          docId: docId,
          groupId,
        },
      },
    });

    return { success: true };
  }

  async listUserPermissions(docId: string) {
    const permissions = await this.prisma.docUserPermission.findMany({
      where: {
        docId: docId,
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

    return {
      data: permissions,
    };
  }

  async listGroupPermissions(docId: string) {
    const permissions = await this.prisma.docGroupPermission.findMany({
      where: {
        docId: docId,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    return {
      data: permissions,
    };
  }
}
