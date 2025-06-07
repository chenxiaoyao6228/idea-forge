import { Injectable, Inject } from "@nestjs/common";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { MoveDocumentsDto } from "./document.dto";
import { presentDocument } from "./document.presenter";
import { NavigationNode, NavigationNodeType } from "contracts";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { ApiException } from "@/_shared/exceptions/api.exception";

@Injectable()
export class MoveDocumentService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  async moveDocs(authorId: number, dto: MoveDocumentsDto) {
    const { id, subspaceId, parentId, index } = dto;
    const affectedDocuments: any[] = [];

    // Existing document fetching and validation...
    const document = await this.prisma.doc.findUnique({
      where: { id },
      include: { subspace: true },
    });

    if (!document) {
      throw new ApiException(ErrorCodeEnum.DocumentNotFound);
    }

    const targetSubspaceId = subspaceId || document.subspaceId;
    const subspaceChanged = targetSubspaceId !== document.subspaceId;
    const parentChanged = parentId !== document.parentId;

    // Update document properties
    const updatedDoc = await this.prisma.doc.update({
      where: { id },
      data: {
        subspaceId: targetSubspaceId,
        parentId: parentId || null,
        updatedAt: new Date(),
      },
      include: { subspace: true },
    });

    affectedDocuments.push(updatedDoc);

    // Handle permission inheritance when parent changes
    if (parentChanged && parentId) {
      // Remove existing inherited permissions
      await this.prisma.docUserPermission.deleteMany({
        where: {
          docId: id,
          sourceId: { not: null }, // Only remove inherited permissions
        },
      });

      // Copy new permissions from new parent
      await this.copyPermissionsFromParent(id, parentId);
    }

    // Handle subspace changes and child documents
    if (subspaceChanged && targetSubspaceId) {
      const childDocuments = await this.updateChildDocumentsSubspace(id, targetSubspaceId);
      affectedDocuments.push(...childDocuments);
    }

    // Update navigation tree structure
    await this.updateNavigationTreeStructure(document, updatedDoc, index, subspaceChanged);

    // Emit events and return response...
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.DOCUMENT_MOVE,
      workspaceId: document.workspaceId,
      actorId: authorId.toString(),
      timestamp: new Date().toISOString(),
      data: {
        affectedDocuments,
        subspaceIds: subspaceChanged ? [{ id: document.subspaceId }, { id: targetSubspaceId }] : [{ id: targetSubspaceId }],
      },
    });

    return {
      data: {
        documents: affectedDocuments.map((doc) => presentDocument(doc, { isPublic: true })),
      },
      policies: subspaceChanged ? this.generatePolicies(affectedDocuments) : [],
    };
  }

  /**
   * Recursively update subspaceId for all child documents when moving across subspaces
   * This ensures the entire document tree maintains consistency
   */
  private async updateChildDocumentsSubspace(parentId: string, newSubspaceId: string) {
    const childDocuments = await this.prisma.doc.findMany({
      where: { parentId },
      include: { subspace: true },
    });

    const updatedChildren = [];

    for (const child of childDocuments) {
      // Update each child document's subspaceId
      const updated = await this.prisma.doc.update({
        where: { id: child.id },
        data: { subspaceId: newSubspaceId },
        include: { subspace: true },
      });
      updatedChildren.push(updated);

      // Recursively update grandchildren documents
      const grandChildren = await this.updateChildDocumentsSubspace(child.id, newSubspaceId);
      updatedChildren.push(...grandChildren);
    }

    return updatedChildren;
  }

  /**
   * Update navigationTree structure in affected subspaces
   * Handles both cross-subspace moves and within-subspace reordering
   */
  private async updateNavigationTreeStructure(oldDoc: any, newDoc: any, index?: number, subspaceChanged = false) {
    if (subspaceChanged) {
      // Remove document from original subspace navigationTree
      await this.removeDocumentFromNavigationTree(oldDoc.subspaceId, oldDoc.id);

      // Add document to new subspace navigationTree
      await this.addDocumentToNavigationTree(newDoc.subspaceId, newDoc, newDoc.parentId, index);
    } else {
      // Move within same subspace - reorder the navigationTree
      await this.moveDocumentInNavigationTree(newDoc.subspaceId, newDoc.id, newDoc.parentId, index);
    }
  }

  /**
   * Add a document node to the navigationTree at specified position
   * Creates the navigation node structure and inserts it properly
   */
  private async addDocumentToNavigationTree(subspaceId: string, doc: any, parentId?: string, index?: number) {
    const subspace = await this.prisma.subspace.findUnique({
      where: { id: subspaceId },
    });

    if (!subspace) return;

    let navigationTree = (subspace.navigationTree as any[]) || [];

    // Create navigation node for the document
    const docNode = {
      type: NavigationNodeType.Document,
      id: doc.id,
      title: doc.title,
      url: `/${doc.id}`,
      icon: doc.icon,
      children: [],
    } as NavigationNode;

    if (!parentId) {
      // Insert at root level
      const insertIndex = index !== undefined ? index : navigationTree.length;
      navigationTree.splice(insertIndex, 0, docNode);
    } else {
      // Insert under specified parent document
      navigationTree = this.insertIntoTree(navigationTree, parentId, docNode, index);
    }

    // Save updated navigationTree back to database
    await this.prisma.subspace.update({
      where: { id: subspaceId },
      data: { navigationTree },
    });
  }

  /**
   * Remove a document from the navigationTree structure
   * Cleans up the tree by removing the document node completely
   */
  private async removeDocumentFromNavigationTree(subspaceId: string, docId: string) {
    const subspace = await this.prisma.subspace.findUnique({
      where: { id: subspaceId },
    });

    if (!subspace?.navigationTree) return;

    // Remove document node from tree structure
    const navigationTree = this.removeFromTree(subspace.navigationTree as any[], docId);

    // Save cleaned navigationTree back to database
    await this.prisma.subspace.update({
      where: { id: subspaceId },
      data: { navigationTree },
    });
  }

  /**
   * Move a document within the same subspace navigationTree
   * Handles reordering and reparenting within the same subspace
   */
  private async moveDocumentInNavigationTree(subspaceId: string, docId: string, newParentId?: string, newIndex?: number) {
    const subspace = await this.prisma.subspace.findUnique({
      where: { id: subspaceId },
    });

    if (!subspace?.navigationTree) return;

    let navigationTree = subspace.navigationTree as any[];

    // 1. Extract the document node from its current position
    const removedNode = this.extractFromTree(navigationTree, docId);
    if (!removedNode) return;

    // 2. Remove the document from the tree
    navigationTree = this.removeFromTree(navigationTree, docId);

    // 3. Insert the document at its new position
    if (!newParentId) {
      // Move to root level
      const insertIndex = newIndex !== undefined ? newIndex : navigationTree.length;
      navigationTree.splice(insertIndex, 0, removedNode);
    } else {
      // Move under new parent document
      navigationTree = this.insertIntoTree(navigationTree, newParentId, removedNode, newIndex);
    }

    // Save updated navigationTree structure
    await this.prisma.subspace.update({
      where: { id: subspaceId },
      data: { navigationTree },
    });
  }

  /**
   * Insert a node into the tree structure under a specific parent
   * Recursively searches for parent and inserts node at specified index
   */
  private insertIntoTree(tree: any[], parentId: string, node: any, index?: number): any[] {
    return tree.map((item) => {
      if (item.id === parentId) {
        // Found the parent - insert node into its children
        const insertIndex = index !== undefined ? index : item.children.length;
        item.children.splice(insertIndex, 0, node);
      } else if (item.children?.length > 0) {
        // Recursively search in children
        item.children = this.insertIntoTree(item.children, parentId, node, index);
      }
      return item;
    });
  }

  /**
   * Remove a document node from the tree structure
   * Recursively removes the node and cleans up empty children arrays
   */
  private removeFromTree(tree: any[], docId: string): any[] {
    return tree
      .filter((node) => node.id !== docId) // Remove matching nodes
      .map((node) => ({
        ...node,
        // Recursively clean children
        children: node.children ? this.removeFromTree(node.children, docId) : [],
      }));
  }

  /**
   * Extract a document node from the tree without removing it
   * Used to get the node structure before moving it to a new position
   */
  private extractFromTree(tree: any[], docId: string): any | null {
    for (const node of tree) {
      if (node.id === docId) {
        return node; // Found the target node
      }
      if (node.children?.length > 0) {
        // Recursively search in children
        const found = this.extractFromTree(node.children, docId);
        if (found) return found;
      }
    }
    return null; // Node not found
  }

  /**
   * Helper method to copy permissions from parent and handle inheritance
   */
  private async copyPermissionsFromParent(documentId: string, parentDocumentId: string) {
    const parentMemberships = await this.prisma.docUserPermission.findMany({
      where: { docId: parentDocumentId },
    });

    for (const membership of parentMemberships) {
      await this.prisma.docUserPermission.create({
        data: {
          docId: documentId,
          userId: membership.userId,
          permission: membership.permission,
          sourceId: membership.sourceId ?? membership.id, // Maintain inheritance chain
          createdById: membership.createdById,
          index: membership.index,
        },
      });
    }
  }

  /**
   * Generate permission policies for affected documents
   * Returns policies array when subspace changes affect permissions
   */
  private generatePolicies(documents: any[]) {
    // TODO:
    // return documents.map((doc) => ({
    //   id: doc.id,
    //   abilities: {
    //     read: true,
    //     update: true,
    //     delete: true,
    //     move: true,
    //     // Add other permissions based on your authorization system
    //   },
    // }));
  }
}
