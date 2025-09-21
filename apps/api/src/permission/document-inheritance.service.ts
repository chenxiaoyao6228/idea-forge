import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionLevel, ResourceType, SourceType } from "@idea/contracts";
import type { UnifiedPermission } from "@idea/contracts";

interface DocumentNode {
  id: string;
  parentId: string | null;
  title: string;
  authorId: string;
  subspaceId: string | null;
  workspaceId: string;
  children: DocumentNode[];
}

interface InheritanceRule {
  fromLevel: PermissionLevel;
  toLevel: PermissionLevel;
  canInherit: boolean;
}

@Injectable()
export class DocumentInheritanceService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Resolve document tree permissions starting from a root document
   * Returns a map of docId to PermissionLevel for the entire tree
   */
  async resolveDocumentTreePermissions(userId: string, rootDocId: string): Promise<Record<string, PermissionLevel>> {
    // Build the document tree
    const documentTree = await this.buildDocumentTree(rootDocId);
    if (!documentTree) {
      return {};
    }

    // Get all document IDs in the tree
    const allDocIds = this.getAllDocumentIds(documentTree);

    // Get existing permissions for all documents
    const existingPermissions = await this.getExistingPermissions(userId, allDocIds);

    // Resolve permissions with inheritance
    const result: Record<string, PermissionLevel> = {};
    await this.resolveTreePermissions(userId, documentTree, existingPermissions, result);

    return result;
  }

  /**
   * Propagate parent permission changes to child documents
   * This handles cascading updates when parent permissions change
   */
  async propagateParentPermissionChanges(parentDocId: string, newPermission: PermissionLevel, updatedByUserId: string): Promise<void> {
    // Get all child documents recursively
    const childDocuments = await this.getAllChildDocuments(parentDocId);

    if (childDocuments.length === 0) {
      return;
    }

    // Determine which child documents should have their permissions updated
    const documentsToUpdate = await this.getDocumentsForInheritanceUpdate(childDocuments, newPermission);

    // Update permissions for affected child documents
    for (const doc of documentsToUpdate) {
      const inheritedPermission = this.calculateInheritedPermission(newPermission, doc.depth);

      if (inheritedPermission !== PermissionLevel.NONE) {
        await this.updateOrCreateInheritedPermission(doc.id, doc.userId, inheritedPermission, parentDocId, updatedByUserId);
      } else {
        // Remove inherited permission if it should be NONE
        await this.removeInheritedPermission(doc.id, doc.userId, parentDocId);
      }
    }
  }

  /**
   * Get inherited permission from parent document
   * This checks the inheritance chain up to find applicable permissions
   */
  async getInheritedPermissionFromParent(userId: string, docId: string): Promise<PermissionLevel> {
    const document = await this.prismaService.doc.findUnique({
      where: { id: docId },
      select: { parentId: true },
    });

    if (!document?.parentId) {
      return PermissionLevel.NONE;
    }

    // Get parent's permission
    const parentPermission = await this.getDocumentPermission(userId, document.parentId);

    if (parentPermission === PermissionLevel.NONE) {
      // Recursively check grandparent
      return this.getInheritedPermissionFromParent(userId, document.parentId);
    }

    // Apply inheritance rules
    return this.applyInheritanceRules(parentPermission);
  }

  /**
   * Handle document move operations - update inheritance when document changes parent
   */
  async handleDocumentMove(docId: string, oldParentId: string | null, newParentId: string | null, movedByUserId: string): Promise<void> {
    // Get all users who have permissions on this document through inheritance
    const inheritedPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType: ResourceType.DOCUMENT,
        resourceId: docId,
        sourceId: { not: null }, // Only inherited permissions
      },
    });

    // Remove old inherited permissions
    if (oldParentId) {
      await this.removeInheritedPermissionsFromParent(docId, oldParentId);
    }

    // Add new inherited permissions if new parent exists
    if (newParentId) {
      await this.establishInheritedPermissionsFromParent(docId, newParentId, movedByUserId);
    }

    // Recursively update child documents
    const childDocuments = await this.getAllChildDocuments(docId);
    for (const child of childDocuments) {
      await this.recalculateInheritedPermissions(child.id, movedByUserId);
    }
  }

  /**
   * Clean up broken inheritance chains
   * This is useful for maintenance and fixing data inconsistencies
   */
  async cleanupBrokenInheritance(): Promise<void> {
    // Find permissions with source that no longer exists
    const brokenPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        sourceId: { not: null },
        source: null,
      },
    });

    // Remove broken inheritance links
    for (const permission of brokenPermissions) {
      await this.prismaService.unifiedPermission.delete({
        where: { id: permission.id },
      });
    }

    // Find documents with parents that no longer exist
    const orphanedDocuments = await this.prismaService.doc.findMany({
      where: {
        parentId: { not: null },
        parent: null,
      },
    });

    // Fix orphaned documents
    for (const doc of orphanedDocuments) {
      await this.prismaService.doc.update({
        where: { id: doc.id },
        data: { parentId: null },
      });
    }
  }

  /**
   * Private helper methods
   */

  private async buildDocumentTree(rootDocId: string): Promise<DocumentNode | null> {
    const document = await this.prismaService.doc.findUnique({
      where: { id: rootDocId },
      select: {
        id: true,
        parentId: true,
        title: true,
        authorId: true,
        subspaceId: true,
        workspaceId: true,
      },
    });

    if (!document) {
      return null;
    }

    const children = await this.getChildDocuments(rootDocId);
    const childNodes: DocumentNode[] = [];

    for (const child of children) {
      const childNode = await this.buildDocumentTree(child.id);
      if (childNode) {
        childNodes.push(childNode);
      }
    }

    return {
      id: document.id,
      parentId: document.parentId,
      title: document.title,
      authorId: document.authorId,
      subspaceId: document.subspaceId,
      workspaceId: document.workspaceId,
      children: childNodes,
    };
  }

  private async getChildDocuments(parentId: string) {
    return this.prismaService.doc.findMany({
      where: { parentId },
      select: {
        id: true,
        parentId: true,
        title: true,
        authorId: true,
        subspaceId: true,
        workspaceId: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  private getAllDocumentIds(node: DocumentNode): string[] {
    const ids = [node.id];
    for (const child of node.children) {
      ids.push(...this.getAllDocumentIds(child));
    }
    return ids;
  }

  private async getExistingPermissions(userId: string, docIds: string[]): Promise<Map<string, UnifiedPermission[]>> {
    const permissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType: ResourceType.DOCUMENT,
        resourceId: { in: docIds },
      },
      orderBy: { priority: "asc" },
    });

    const permissionMap = new Map<string, UnifiedPermission[]>();
    for (const permission of permissions) {
      if (!permissionMap.has(permission.resourceId)) {
        permissionMap.set(permission.resourceId, []);
      }
      permissionMap.get(permission.resourceId)!.push(permission);
    }

    return permissionMap;
  }

  private async resolveTreePermissions(
    userId: string,
    node: DocumentNode,
    existingPermissions: Map<string, UnifiedPermission[]>,
    result: Record<string, PermissionLevel>,
    parentPermission?: PermissionLevel,
  ): Promise<void> {
    // Check if user is author
    if (node.authorId === userId) {
      result[node.id] = PermissionLevel.OWNER;
    } else {
      // Check direct permissions first
      const nodePermissions = existingPermissions.get(node.id) || [];
      const directPermissions = nodePermissions.filter((p) => p.sourceType === SourceType.DIRECT || p.sourceType === SourceType.GROUP);

      if (directPermissions.length > 0) {
        result[node.id] = directPermissions[0].permission;
      } else if (parentPermission) {
        // Apply inheritance from parent
        result[node.id] = this.applyInheritanceRules(parentPermission);
      } else {
        // No direct permission and no parent permission
        result[node.id] = PermissionLevel.NONE;
      }
    }

    // Recursively resolve children
    const nodePermission = result[node.id];
    for (const child of node.children) {
      await this.resolveTreePermissions(userId, child, existingPermissions, result, nodePermission);
    }
  }

  private async getAllChildDocuments(parentId: string, depth = 0): Promise<Array<{ id: string; userId: string; depth: number }>> {
    const children = await this.prismaService.doc.findMany({
      where: { parentId },
      select: { id: true, authorId: true },
    });

    const result: Array<{ id: string; userId: string; depth: number }> = [];

    for (const child of children) {
      result.push({ id: child.id, userId: child.authorId, depth: depth + 1 });

      // Recursively get grandchildren
      const grandchildren = await this.getAllChildDocuments(child.id, depth + 1);
      result.push(...grandchildren);
    }

    return result;
  }

  private async getDocumentsForInheritanceUpdate(
    childDocuments: Array<{ id: string; userId: string; depth: number }>,
    newParentPermission: PermissionLevel,
  ): Promise<Array<{ id: string; userId: string; depth: number }>> {
    // Filter documents that don't already have higher priority permissions
    const documentsToUpdate: Array<{ id: string; userId: string; depth: number }> = [];

    for (const doc of childDocuments) {
      const existingPermissions = await this.prismaService.unifiedPermission.findMany({
        where: {
          userId: doc.userId,
          resourceType: ResourceType.DOCUMENT,
          resourceId: doc.id,
          sourceType: { in: [SourceType.DIRECT, SourceType.GROUP] },
        },
        orderBy: { priority: "asc" },
      });

      // Only update if no higher priority permissions exist
      if (existingPermissions.length === 0) {
        documentsToUpdate.push(doc);
      }
    }

    return documentsToUpdate;
  }

  private calculateInheritedPermission(parentPermission: PermissionLevel, depth: number): PermissionLevel {
    // Apply inheritance rules with depth consideration
    let inheritedPermission = this.applyInheritanceRules(parentPermission);

    // Further reduce permission based on depth (optional rule)
    if (depth > 2) {
      // Beyond 2 levels deep, only allow READ permission at most
      if (inheritedPermission === PermissionLevel.EDIT || inheritedPermission === PermissionLevel.MANAGE) {
        inheritedPermission = PermissionLevel.READ;
      }
    }

    return inheritedPermission;
  }

  private async updateOrCreateInheritedPermission(
    docId: string,
    userId: string,
    permission: PermissionLevel,
    sourcePermissionId: string,
    createdByUserId: string,
  ): Promise<void> {
    await this.prismaService.unifiedPermission.upsert({
      where: {
        userId_guestId_resourceType_resourceId_sourceType: {
          userId,
          guestId: "",
          resourceType: ResourceType.DOCUMENT,
          resourceId: docId,
          sourceType: SourceType.DIRECT, // Inherited permissions are stored as DIRECT with sourceId
        },
      },
      create: {
        userId,
        resourceType: ResourceType.DOCUMENT,
        resourceId: docId,
        permission,
        sourceType: SourceType.DIRECT,
        priority: 1,
        sourceId: sourcePermissionId,
        createdById: createdByUserId,
      },
      update: {
        permission,
        sourceId: sourcePermissionId,
      },
    });
  }

  private async removeInheritedPermission(docId: string, userId: string, sourcePermissionId: string): Promise<void> {
    await this.prismaService.unifiedPermission.deleteMany({
      where: {
        userId,
        resourceType: ResourceType.DOCUMENT,
        resourceId: docId,
        sourceId: sourcePermissionId,
      },
    });
  }

  private async getDocumentPermission(userId: string, docId: string): Promise<PermissionLevel> {
    const permissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        userId,
        resourceType: ResourceType.DOCUMENT,
        resourceId: docId,
      },
      orderBy: { priority: "asc" },
    });

    return permissions.length > 0 ? permissions[0].permission : PermissionLevel.NONE;
  }

  private applyInheritanceRules(parentPermission: PermissionLevel): PermissionLevel {
    // Define inheritance rules - children get reduced permissions
    const inheritanceRules: Record<PermissionLevel, PermissionLevel> = {
      [PermissionLevel.OWNER]: PermissionLevel.READ,
      [PermissionLevel.MANAGE]: PermissionLevel.READ,
      [PermissionLevel.EDIT]: PermissionLevel.READ,
      [PermissionLevel.COMMENT]: PermissionLevel.COMMENT,
      [PermissionLevel.READ]: PermissionLevel.READ,
      [PermissionLevel.NONE]: PermissionLevel.NONE,
    };

    return inheritanceRules[parentPermission] || PermissionLevel.NONE;
  }

  private async removeInheritedPermissionsFromParent(docId: string, oldParentId: string): Promise<void> {
    // Find the parent permission that was the source
    const parentPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType: ResourceType.DOCUMENT,
        resourceId: oldParentId,
      },
    });

    // Remove inherited permissions that came from the old parent
    for (const parentPerm of parentPermissions) {
      await this.prismaService.unifiedPermission.deleteMany({
        where: {
          resourceType: ResourceType.DOCUMENT,
          resourceId: docId,
          sourceId: parentPerm.id,
        },
      });
    }
  }

  private async establishInheritedPermissionsFromParent(docId: string, newParentId: string, createdByUserId: string): Promise<void> {
    // Get all permissions on the new parent
    const parentPermissions = await this.prismaService.unifiedPermission.findMany({
      where: {
        resourceType: ResourceType.DOCUMENT,
        resourceId: newParentId,
      },
      orderBy: { priority: "asc" },
    });

    // Create inherited permissions for each user who has parent access
    for (const parentPerm of parentPermissions) {
      if (parentPerm.userId) {
        const inheritedPermission = this.applyInheritanceRules(parentPerm.permission);

        if (inheritedPermission !== PermissionLevel.NONE) {
          await this.updateOrCreateInheritedPermission(docId, parentPerm.userId, inheritedPermission, parentPerm.id, createdByUserId);
        }
      }
    }
  }

  private async recalculateInheritedPermissions(docId: string, updatedByUserId: string): Promise<void> {
    // Get the document's current parent
    const document = await this.prismaService.doc.findUnique({
      where: { id: docId },
      select: { parentId: true },
    });

    if (document?.parentId) {
      // Remove existing inherited permissions
      await this.prismaService.unifiedPermission.deleteMany({
        where: {
          resourceType: ResourceType.DOCUMENT,
          resourceId: docId,
          sourceId: { not: null },
        },
      });

      // Re-establish permissions from current parent
      await this.establishInheritedPermissionsFromParent(docId, document.parentId, updatedByUserId);
    }
  }
}
