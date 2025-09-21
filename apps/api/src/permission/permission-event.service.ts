import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { PermissionContextService } from "./permission-context.service";
import { EnhancedPermissionService } from "./enhanced-permission.service";
import { SubspacePermissionService } from "./subspace-permission.service";
import { DocumentInheritanceService } from "./document-inheritance.service";
import { PermissionWebsocketService } from "./permission-websocket.service";
import { PermissionLevel, ResourceType, SourceType, WorkspaceRole, SubspaceRole, SubspaceType } from "@prisma/client";

/**
 * Service to handle permission-related events and user state changes
 * Manages edge cases like user removal from subspace while maintaining direct shares
 */
@Injectable()
export class PermissionEventService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly permissionContextService: PermissionContextService,
    private readonly enhancedPermissionService: EnhancedPermissionService,
    private readonly subspacePermissionService: SubspacePermissionService,
    private readonly documentInheritanceService: DocumentInheritanceService,
    private readonly permissionWebsocketService: PermissionWebsocketService,
  ) {}

  /**
   * Handle user removal from subspace while maintaining direct document shares
   * This is a critical edge case where user loses subspace access but keeps direct permissions
   */
  async handleUserRemovedFromSubspace(userId: string, subspaceId: string): Promise<void> {
    try {
      // 1. Get all documents in the subspace
      const subspaceDocuments = await this.prismaService.doc.findMany({
        where: { subspaceId },
        select: { id: true, title: true },
      });

      // 2. Check which documents the user has direct permissions to
      const directPermissions = await this.prismaService.unifiedPermission.findMany({
        where: {
          userId,
          resourceType: ResourceType.DOCUMENT,
          resourceId: { in: subspaceDocuments.map((doc) => doc.id) },
          sourceType: { in: [SourceType.DIRECT, SourceType.GROUP] },
        },
      });

      // 3. Remove subspace-based permissions for this user
      await this.prismaService.unifiedPermission.deleteMany({
        where: {
          userId,
          resourceType: ResourceType.DOCUMENT,
          resourceId: { in: subspaceDocuments.map((doc) => doc.id) },
          sourceType: { in: [SourceType.SUBSPACE_ADMIN, SourceType.SUBSPACE_MEMBER] },
        },
      });

      // 4. Invalidate permission cache for affected documents
      const affectedDocumentIds = subspaceDocuments.map((doc) => doc.id);
      for (const docId of affectedDocumentIds) {
        await this.permissionContextService.invalidatePermissionCache(userId, ResourceType.DOCUMENT, docId);
      }

      // 5. Log the event for audit purposes
      console.log(`User ${userId} removed from subspace ${subspaceId}. Maintained direct permissions for ${directPermissions.length} documents.`);

      // 6. Return information about maintained permissions
      const maintainedDocuments = directPermissions.map((perm) => ({
        documentId: perm.resourceId,
        permission: perm.permission,
        source: perm.sourceType,
      }));

      console.log(`Maintained permissions:`, maintainedDocuments);

      // Broadcast permission changes to affected documents
      for (const doc of maintainedDocuments) {
        await this.permissionWebsocketService.notifySubspacePermissionUpdate(
          subspaceId,
          [userId],
          "system", // System-initiated change
          "MEMBER_PERMISSION",
          doc.permission,
        );
      }
    } catch (error) {
      console.error(`Error handling user removal from subspace:`, error);
      throw error;
    }
  }

  /**
   * Handle workspace member role changes and propagate to all affected resources
   */
  async handleWorkspaceRoleChange(userId: string, workspaceId: string, oldRole: WorkspaceRole, newRole: WorkspaceRole): Promise<void> {
    try {
      // 1. Get all resources in the workspace that might be affected
      const [documents, subspaces] = await Promise.all([
        this.prismaService.doc.findMany({
          where: { workspaceId },
          select: { id: true },
        }),
        this.prismaService.subspace.findMany({
          where: { workspaceId },
          select: { id: true },
        }),
      ]);

      // 2. Update workspace-level permissions
      await this.prismaService.unifiedPermission.updateMany({
        where: {
          userId,
          resourceType: ResourceType.WORKSPACE,
          resourceId: workspaceId,
          sourceType: { in: [SourceType.WORKSPACE_ADMIN, SourceType.WORKSPACE_MEMBER] },
        },
        data: {
          sourceType: newRole === WorkspaceRole.ADMIN ? SourceType.WORKSPACE_ADMIN : SourceType.WORKSPACE_MEMBER,
        },
      });

      // 3. Handle document permissions based on role change
      const documentIds = documents.map((doc) => doc.id);
      if (documentIds.length > 0) {
        // Remove old workspace-based document permissions
        await this.prismaService.unifiedPermission.deleteMany({
          where: {
            userId,
            resourceType: ResourceType.DOCUMENT,
            resourceId: { in: documentIds },
            sourceType: { in: [SourceType.WORKSPACE_ADMIN, SourceType.WORKSPACE_MEMBER] },
          },
        });

        // Add new workspace-based document permissions if role grants access
        if (newRole === WorkspaceRole.ADMIN || newRole === WorkspaceRole.MEMBER) {
          const sourceType = newRole === WorkspaceRole.ADMIN ? SourceType.WORKSPACE_ADMIN : SourceType.WORKSPACE_MEMBER;

          const permissionLevel = newRole === WorkspaceRole.ADMIN ? PermissionLevel.MANAGE : PermissionLevel.READ;

          const permissionsToCreate = documentIds.map((docId) => ({
            userId,
            resourceType: ResourceType.DOCUMENT,
            resourceId: docId,
            sourceType,
            permission: permissionLevel,
            priority: sourceType === SourceType.WORKSPACE_ADMIN ? 5 : 6,
            createdById: userId, // Add required field
          }));

          await this.prismaService.unifiedPermission.createMany({
            data: permissionsToCreate,
            skipDuplicates: true,
          });
        }
      }

      // 4. Handle subspace permissions
      const subspaceIds = subspaces.map((subspace) => subspace.id);
      if (subspaceIds.length > 0) {
        await this.prismaService.unifiedPermission.updateMany({
          where: {
            userId,
            resourceType: ResourceType.SUBSPACE,
            resourceId: { in: subspaceIds },
            sourceType: { in: [SourceType.WORKSPACE_ADMIN, SourceType.WORKSPACE_MEMBER] },
          },
          data: {
            sourceType: newRole === WorkspaceRole.ADMIN ? SourceType.WORKSPACE_ADMIN : SourceType.WORKSPACE_MEMBER,
          },
        });
      }

      // 5. Invalidate permission cache for all affected resources
      for (const docId of documentIds) {
        await this.permissionContextService.invalidatePermissionCache(userId, ResourceType.DOCUMENT, docId);
      }

      for (const subspaceId of subspaceIds) {
        await this.permissionContextService.invalidatePermissionCache(userId, ResourceType.SUBSPACE, subspaceId);
      }

      await this.permissionContextService.invalidatePermissionCache(userId, ResourceType.WORKSPACE, workspaceId);

      console.log(`Workspace role changed for user ${userId} from ${oldRole} to ${newRole} in workspace ${workspaceId}`);
    } catch (error) {
      console.error(`Error handling workspace role change:`, error);
      throw error;
    }
  }

  /**
   * Handle subspace member role changes and update document permissions accordingly
   */
  async handleSubspaceRoleChange(userId: string, subspaceId: string, oldRole: SubspaceRole | null, newRole: SubspaceRole | null): Promise<void> {
    try {
      // 1. Get all documents in the subspace
      const subspaceDocuments = await this.prismaService.doc.findMany({
        where: { subspaceId },
        select: { id: true },
      });

      const documentIds = subspaceDocuments.map((doc) => doc.id);

      // 2. Remove old subspace-based permissions
      if (oldRole) {
        await this.prismaService.unifiedPermission.deleteMany({
          where: {
            userId,
            resourceType: ResourceType.DOCUMENT,
            resourceId: { in: documentIds },
            sourceType: { in: [SourceType.SUBSPACE_ADMIN, SourceType.SUBSPACE_MEMBER] },
          },
        });
      }

      // 3. Add new subspace-based permissions if new role grants access
      if (newRole && documentIds.length > 0) {
        const sourceType = newRole === SubspaceRole.ADMIN ? SourceType.SUBSPACE_ADMIN : SourceType.SUBSPACE_MEMBER;

        // Get subspace permission settings to determine permission level
        const subspace = await this.prismaService.subspace.findUnique({
          where: { id: subspaceId },
          select: {
            subspaceAdminPermission: true,
            subspaceMemberPermission: true,
          },
        });

        if (subspace) {
          const permissionLevel = newRole === SubspaceRole.ADMIN ? subspace.subspaceAdminPermission : subspace.subspaceMemberPermission;

          const permissionsToCreate = documentIds.map((docId) => ({
            userId,
            resourceType: ResourceType.DOCUMENT,
            resourceId: docId,
            sourceType,
            permission: permissionLevel,
            priority: sourceType === SourceType.SUBSPACE_ADMIN ? 3 : 4,
            createdById: userId, // Add required field
          }));

          await this.prismaService.unifiedPermission.createMany({
            data: permissionsToCreate,
            skipDuplicates: true,
          });
        }
      }

      // 4. Update subspace-level permission
      if (newRole) {
        const sourceType = newRole === SubspaceRole.ADMIN ? SourceType.SUBSPACE_ADMIN : SourceType.SUBSPACE_MEMBER;

        // Try to find existing permission first
        const existingPermission = await this.prismaService.unifiedPermission.findFirst({
          where: {
            userId,
            resourceType: ResourceType.SUBSPACE,
            resourceId: subspaceId,
            sourceType,
          },
        });

        if (existingPermission) {
          await this.prismaService.unifiedPermission.update({
            where: { id: existingPermission.id },
            data: {
              permission: newRole === SubspaceRole.ADMIN ? PermissionLevel.MANAGE : PermissionLevel.READ,
            },
          });
        } else {
          await this.prismaService.unifiedPermission.create({
            data: {
              userId,
              resourceType: ResourceType.SUBSPACE,
              resourceId: subspaceId,
              sourceType,
              permission: newRole === SubspaceRole.ADMIN ? PermissionLevel.MANAGE : PermissionLevel.READ,
              priority: sourceType === SourceType.SUBSPACE_ADMIN ? 3 : 4,
              createdById: userId,
            },
          });
        }
      } else {
        // Remove subspace permission if role is removed
        await this.prismaService.unifiedPermission.deleteMany({
          where: {
            userId,
            resourceType: ResourceType.SUBSPACE,
            resourceId: subspaceId,
            sourceType: { in: [SourceType.SUBSPACE_ADMIN, SourceType.SUBSPACE_MEMBER] },
          },
        });
      }

      // 5. Invalidate permission cache
      for (const docId of documentIds) {
        await this.permissionContextService.invalidatePermissionCache(userId, ResourceType.DOCUMENT, docId);
      }

      await this.permissionContextService.invalidatePermissionCache(userId, ResourceType.SUBSPACE, subspaceId);

      console.log(`Subspace role changed for user ${userId} from ${oldRole} to ${newRole} in subspace ${subspaceId}`);
    } catch (error) {
      console.error(`Error handling subspace role change:`, error);
      throw error;
    }
  }

  /**
   * Handle subspace type changes and their impact on document permissions
   */
  async handleSubspaceTypeChange(subspaceId: string, oldType: SubspaceType, newType: SubspaceType): Promise<void> {
    try {
      // 1. Get all documents in the subspace
      const subspaceDocuments = await this.prismaService.doc.findMany({
        where: { subspaceId },
        select: { id: true },
      });

      // 2. Get all workspace members who aren't subspace members
      const subspace = await this.prismaService.subspace.findUnique({
        where: { id: subspaceId },
        include: {
          workspace: {
            include: {
              members: {
                select: { userId: true },
              },
            },
          },
          members: {
            select: { userId: true },
          },
        },
      });

      if (!subspace) return;

      const workspaceMemberIds = subspace.workspace.members.map((m) => m.userId);
      const subspaceMemberIds = subspace.members.map((m) => m.userId);
      const nonSubspaceMemberIds = workspaceMemberIds.filter((id) => !subspaceMemberIds.includes(id));

      // 3. Update permissions based on new subspace type
      await this.subspacePermissionService.handleSubspaceTypeChange(subspaceId, oldType, newType);

      // 4. Invalidate permission cache for all affected users and documents
      const allAffectedUserIds = [...workspaceMemberIds];
      const documentIds = subspaceDocuments.map((doc) => doc.id);

      for (const userId of allAffectedUserIds) {
        for (const docId of documentIds) {
          await this.permissionContextService.invalidatePermissionCache(userId, ResourceType.DOCUMENT, docId);
        }

        await this.permissionContextService.invalidatePermissionCache(userId, ResourceType.SUBSPACE, subspaceId);
      }

      console.log(
        `Subspace type changed from ${oldType} to ${newType} for subspace ${subspaceId}. Affected ${allAffectedUserIds.length} users and ${documentIds.length} documents.`,
      );
    } catch (error) {
      console.error(`Error handling subspace type change:`, error);
      throw error;
    }
  }

  /**
   * Handle document move between subspaces
   * Recalculates permissions based on new subspace context
   */
  async handleDocumentMove(documentId: string, oldSubspaceId: string | null, newSubspaceId: string | null): Promise<void> {
    try {
      // Use the document inheritance service to handle the move
      // Note: The document inheritance service handles parent-child relationships, not subspace moves
      // We'll handle subspace permission changes directly here
      // await this.documentInheritanceService.handleDocumentMove(documentId, oldParentId, newParentId, userId);

      // Get all users who might be affected by this move
      const affectedUserIds = new Set<string>();

      // Add users with direct permissions to the document
      const directPermissions = await this.prismaService.unifiedPermission.findMany({
        where: {
          resourceType: ResourceType.DOCUMENT,
          resourceId: documentId,
        },
        select: { userId: true },
      });

      directPermissions.forEach((perm) => {
        if (perm.userId) affectedUserIds.add(perm.userId);
      });

      // Add users from old subspace if it existed
      if (oldSubspaceId) {
        const oldSubspaceMembers = await this.prismaService.subspaceMember.findMany({
          where: { subspaceId: oldSubspaceId },
          select: { userId: true },
        });
        oldSubspaceMembers.forEach((member) => affectedUserIds.add(member.userId));
      }

      // Add users from new subspace if it exists
      if (newSubspaceId) {
        const newSubspaceMembers = await this.prismaService.subspaceMember.findMany({
          where: { subspaceId: newSubspaceId },
          select: { userId: true },
        });
        newSubspaceMembers.forEach((member) => affectedUserIds.add(member.userId));
      }

      // Invalidate permission cache for all affected users
      for (const userId of affectedUserIds) {
        await this.permissionContextService.invalidatePermissionCache(userId, ResourceType.DOCUMENT, documentId);
      }

      console.log(`Document ${documentId} moved from subspace ${oldSubspaceId} to ${newSubspaceId}. Invalidated cache for ${affectedUserIds.size} users.`);
    } catch (error) {
      console.error(`Error handling document move:`, error);
      throw error;
    }
  }

  /**
   * Handle bulk permission updates (e.g., when admin changes subspace settings)
   */
  async handleBulkPermissionUpdate(resourceType: ResourceType, resourceIds: string[], userId?: string): Promise<void> {
    try {
      // If specific user, invalidate only for that user
      if (userId) {
        for (const resourceId of resourceIds) {
          await this.permissionContextService.invalidatePermissionCache(userId, resourceType, resourceId);
        }
      } else {
        // Invalidate for all users who might have access to these resources
        const permissions = await this.prismaService.unifiedPermission.findMany({
          where: {
            resourceType,
            resourceId: { in: resourceIds },
          },
          select: { userId: true, resourceId: true },
          distinct: ["userId", "resourceId"],
        });

        for (const perm of permissions) {
          if (perm.userId) {
            await this.permissionContextService.invalidatePermissionCache(perm.userId, resourceType, perm.resourceId);
          }
        }
      }

      console.log(`Bulk permission update completed for ${resourceIds.length} ${resourceType} resources`);
    } catch (error) {
      console.error(`Error handling bulk permission update:`, error);
      throw error;
    }
  }

  /**
   * Handle guest user permission expiration
   */
  async handleGuestPermissionExpiration(userId: string, resourceId: string): Promise<void> {
    try {
      // Remove expired guest permissions
      await this.prismaService.unifiedPermission.deleteMany({
        where: {
          userId,
          resourceId,
          sourceType: SourceType.GUEST,
        },
      });

      // Invalidate permission cache
      await this.permissionContextService.invalidatePermissionCache(userId, ResourceType.DOCUMENT, resourceId);

      console.log(`Guest permission expired for user ${userId} on resource ${resourceId}`);
    } catch (error) {
      console.error(`Error handling guest permission expiration:`, error);
      throw error;
    }
  }
}
