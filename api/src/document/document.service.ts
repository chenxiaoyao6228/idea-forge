import { Injectable, Inject } from "@nestjs/common";
import { CreateDocumentDto, DocumentPagerDto, UpdateDocumentDto } from "./document.dto";
import { CreateDocumentResponse, NavigationNode, NavigationNodeType } from "contracts";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";

@Injectable()
export class DocumentService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

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
      },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Check basic visibility (simplified, no complex permissions yet)
    const isPublic = document.visibility === "PUBLIC";

    // Present document data (similar to presentDocument)
    const serializedDocument = this.presentDocument(document, { isPublic });

    const data = {
      document: serializedDocument,
      workspace: document.workspace,
      // Placeholder for shared tree functionality
      sharedTree: null,
    };

    return {
      data,
      // Placeholder for policies
      policies: isPublic ? undefined : this.presentPoliciesPlaceholder(userId, document),
    };
  }

  private presentDocument(document: any, options: { isPublic: boolean }) {
    return {
      id: document.id,
      title: document.title,
      content: document.content,
      type: document.type,
      visibility: document.visibility,
      icon: document.icon,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
      publishedAt: document.publishedAt,
      archivedAt: document.archivedAt,
      deletedAt: document.deletedAt,
      position: document.position,
      parentId: document.parentId,
      workspaceId: document.workspaceId,
      subspaceId: document.subspaceId,
      // Include author info if not public
      author: options.isPublic
        ? undefined
        : {
            id: document.author.id,
            displayName: document.author.displayName,
            email: document.author.email,
            imageUrl: document.author.imageUrl,
          },
      // Include workspace/subspace info
      workspace: document.workspace,
      subspace: document.subspace,
      // Parent and children for navigation
      parent: document.parent,
      children: document.children,
      // Cover image
      coverImage: document.coverImage,
      // Revision count
      // revisionCount: document.revisions.length,
    };
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
      // isDraft: !doc.publishedAt,
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

    return this.presentDocument(doc, { isPublic: true });
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
                some: { userId },
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
    }));

    return {
      pagination: { page, limit, total },
      data,
      policies: {},
    };
  }
}
