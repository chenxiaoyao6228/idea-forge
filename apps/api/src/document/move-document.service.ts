import { Injectable } from "@nestjs/common";
import { MoveDocumentsDto } from "./document.dto";
import { presentDocument } from "./document.presenter";
import { NavigationNode, NavigationNodeType, Subspace } from "@idea/contracts";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { HttpStatus } from "@nestjs/common";
import { Transactional, TransactionHost } from "@nestjs-cls/transactional";
import { TransactionalAdapterPrisma } from "@nestjs-cls/transactional-adapter-prisma";
import { ExtendedPrismaClient } from "@/_shared/database/prisma/prisma.extension";
// import { PermissionEventService } from "@/permission/permission-event.service";

/*
This service supports the following document move features:
1. Moving documents within a subspace: Documents can be repositioned within the same subspace (including folders and regular documents).
2. Moving documents and their children to another subspace: Supports moving documents and their entire subtree (folders) to another subspace, recursively updating all child documents' subspaceId and updating the navigation tree structure.
3. Moving documents and their children to "My Docs" (MyDocs/Drafts): Supports moving documents and their entire subtree from a subspace to personal drafts, updating both relationships and navigation tree structures.
4. Moving documents and their children from "My Docs" to a subspace: Supports moving documents and their entire subtree from drafts to a specified subspace, recursively updating the navigation tree and subspaceId.
5. Moving documents and their children to a new parent document: Supports moving documents (and their subtree) to a new parent document, and specifying an insertion position (index).
6. Synchronizing the navigation tree: Ensures that the navigation tree structures of the source subspace and target subspace are correctly updated, without duplicate nodes.
7. Recursively updating all child document subspaceId: When moving across subspaces or drafts, recursively updating the subspaceId of all descendant documents.
8. Permission and event handling: Automatically recalculates permissions after moving, and publishes real-time events.
*/
@Injectable()
export class MoveDocumentService {
  constructor(
    private readonly eventPublisher: EventPublisherService,
    private readonly docPermissionResolveService: DocPermissionResolveService,
    private readonly txHost: TransactionHost<TransactionalAdapterPrisma<ExtendedPrismaClient>>,
  ) {}

  @Transactional()
  async moveDocs(authorId: string, dto: MoveDocumentsDto) {
    const { id, subspaceId, parentId, index } = dto;
    const prisma = this.txHost.tx;
    // 1. Fetch and validate the document
    const document = await prisma.doc.findUnique({ where: { id }, include: { subspace: true } });
    if (!document) throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    if (id === parentId) throw new ApiException(ErrorCodeEnum.DocumentCircularReference, HttpStatus.BAD_REQUEST);

    // Prevent moving under own descendant
    if (parentId) {
      let currentParentId: string | null = parentId;
      while (currentParentId) {
        if (currentParentId === id) {
          throw new ApiException(ErrorCodeEnum.DocumentCircularReference, HttpStatus.BAD_REQUEST);
        }
        const parentDoc = await prisma.doc.findUnique({ where: { id: currentParentId }, select: { parentId: true } });
        if (!parentDoc) break;
        currentParentId = parentDoc.parentId;
      }
    }

    // 2. Fetch the subspace and its navigationTree with transaction isolation
    const targetSubspaceId = subspaceId;
    const subspaceChanged = targetSubspaceId !== document.subspaceId;
    let oldSubspace: Subspace | null = null;
    let newSubspace: Subspace | null = null;

    if (document.subspaceId) {
      // Use findUniqueOrThrow to ensure we get the latest data
      // The @Transactional() decorator provides SERIALIZABLE isolation level
      // which prevents race conditions similar to row-level locking
      oldSubspace = await prisma.subspace.findUniqueOrThrow({
        where: { id: document.subspaceId },
      });
    }

    if (targetSubspaceId) {
      newSubspace = await prisma.subspace.findUniqueOrThrow({
        where: { id: targetSubspaceId },
      });
      if (!newSubspace) throw new ApiException(ErrorCodeEnum.SubspaceNotFound);
    }

    // 3. Handle navigation tree updates
    if (oldSubspace && newSubspace && oldSubspace.id === newSubspace.id) {
      // Moving within the same subspace - remove and re-insert in one operation
      let tree: NavigationNode[] = [];
      if (Array.isArray(oldSubspace.navigationTree)) {
        tree = oldSubspace.navigationTree as NavigationNode[];
      }

      // Remove the document from the tree
      tree = this.removeFromTree(tree, id);

      // Create the document node (with children if folder)
      const docNode = await this.buildNavigationNodeWithChildren(document.id);

      // Insert at the new position
      if (!parentId) {
        // Insert at root level at specified position
        const insertIndex = typeof index === "number" ? index : tree.length;
        tree.splice(insertIndex, 0, docNode);
      } else {
        tree = this.insertNodeUnderParent(tree, parentId, docNode, typeof index === "number" ? index : undefined);
      }

      // Update the subspace with the new tree
      await prisma.subspace.update({ where: { id: oldSubspace.id }, data: { navigationTree: tree } });
    } else {
      // Moving between different subspaces (or to/from my-docs)
      // 3a. Remove from old navigationTree if needed
      if (oldSubspace?.navigationTree) {
        const newTree = this.removeFromTree(oldSubspace?.navigationTree as NavigationNode[], id);
        await prisma.subspace.update({ where: { id: oldSubspace.id }, data: { navigationTree: newTree } });
      }

      // 3b. Insert into new navigationTree if needed
      if (newSubspace) {
        const docNode = await this.buildNavigationNodeWithChildren(document.id);
        let tree: NavigationNode[] = [];
        if (Array.isArray(newSubspace.navigationTree)) {
          tree = newSubspace.navigationTree as NavigationNode[];
        }
        if (!parentId) {
          // Insert at root level at specified position
          const insertIndex = typeof index === "number" ? index : tree.length;
          tree.splice(insertIndex, 0, docNode);
        } else {
          tree = this.insertNodeUnderParent(tree, parentId, docNode, typeof index === "number" ? index : undefined);
        }
        await prisma.subspace.update({ where: { id: newSubspace.id }, data: { navigationTree: tree } });
      }
    }
    // 5. Update doc's parentId/subspaceId if changed
    const updatedDoc = await prisma.doc.update({
      where: { id },
      data: {
        subspaceId: targetSubspaceId,
        parentId: parentId || null,
        updatedAt: new Date(),
      },
      include: { subspace: true },
    });

    // Handle permission updates for document move
    if (subspaceChanged) {
      // TODO: notice event
    }

    // 6. If subspace changed, recursively update all children subspaceId
    if (subspaceChanged) {
      await this.updateChildDocumentsSubspace(id, targetSubspaceId || null);
    }
    // 7. Publish event
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.DOCUMENT_MOVE,
      workspaceId: document.workspaceId,
      actorId: authorId.toString(),
      timestamp: new Date().toISOString(),
      data: {
        affectedDocuments: [updatedDoc],
        subspaceIds: subspaceChanged
          ? [{ id: document.subspaceId }, { id: targetSubspaceId }].filter((s) => s.id !== null)
          : targetSubspaceId
            ? [{ id: targetSubspaceId }]
            : [],
      },
    });
    // 8. Permissions
    const abilities = await this.docPermissionResolveService.getResourcePermissionAbilities(updatedDoc.id, authorId);
    return { data: { documents: [presentDocument(updatedDoc, { isPublic: true })] }, permissions: { [updatedDoc.id]: abilities } };
  }

  // Insert node under a parent node at specified position
  private insertNodeUnderParent(tree: NavigationNode[], parentId: string, node: NavigationNode, insertIndex?: number): NavigationNode[] {
    return tree.map((item) => {
      if (item.id === parentId) {
        const newChildren = [...item.children];
        const index = insertIndex !== undefined ? insertIndex : newChildren.length;
        newChildren.splice(index, 0, node);
        return { ...item, children: newChildren };
      }

      if (item.children?.length) {
        return { ...item, children: this.insertNodeUnderParent(item.children, parentId, node, insertIndex) };
      }
      return item;
    });
  }

  // Remove a node from the tree
  private removeFromTree(tree: NavigationNode[], docId: string): NavigationNode[] {
    return tree.filter((node) => node.id !== docId).map((node) => ({ ...node, children: this.removeFromTree(node.children, docId) }));
  }

  // Recursively update subspaceId for all children
  private async updateChildDocumentsSubspace(parentId: string, newSubspaceId: string | null) {
    const prisma = this.txHost.tx;
    const childDocuments = await prisma.doc.findMany({ where: { parentId } });
    for (const child of childDocuments) {
      await prisma.doc.update({ where: { id: child.id }, data: { subspaceId: newSubspaceId } });
      await this.updateChildDocumentsSubspace(child.id, newSubspaceId);
    }
  }

  // Helper: Recursively build NavigationNode for a document and its children
  private async buildNavigationNodeWithChildren(docId: string): Promise<NavigationNode> {
    const prisma = this.txHost.tx;
    const doc = await prisma.doc.findUnique({ where: { id: docId } });
    if (!doc) throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    const children = await prisma.doc.findMany({ where: { parentId: docId } });
    return {
      id: doc.id,
      type: NavigationNodeType.Document,
      title: doc.title,
      url: `/${doc.id}`,
      icon: doc.icon || undefined,
      children: await Promise.all(children.map((child) => this.buildNavigationNodeWithChildren(child.id))),
    };
  }
}
