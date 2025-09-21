import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";
import { PermissionLevel, ResourceType, SourceType } from "@prisma/client";

/**
 * Event types for permission updates
 */
export interface PermissionUpdateEvent {
  type: "PERMISSION_CHANGED" | "ACCESS_REVOKED" | "DOCUMENT_SHARED" | "SUBSPACE_PERMISSION_UPDATED";
  resourceId: string;
  resourceType: "DOCUMENT" | "SUBSPACE" | "WORKSPACE";
  userId: string;
  newPermission?: PermissionLevel;
  message?: string;
  timestamp: string;
  actorId?: string; // Who made the change
}

/**
 * Service for broadcasting permission changes via WebSocket
 * Handles real-time permission updates and collaboration notifications
 */
@Injectable()
export class PermissionWebsocketService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventPublisher: EventPublisherService,
  ) {}

  /**
   * Broadcast permission change to affected user
   */
  async broadcastPermissionChange(docId: string, userId: string, newPermission: PermissionLevel, actorId: string, message?: string): Promise<void> {
    try {
      // Get document info for workspace routing
      const document = await this.prismaService.doc.findUnique({
        where: { id: docId },
        select: { workspaceId: true, title: true },
      });

      if (!document) {
        console.warn(`Document ${docId} not found for permission broadcast`);
        return;
      }

      const event: PermissionUpdateEvent = {
        type: "PERMISSION_CHANGED",
        resourceId: docId,
        resourceType: "DOCUMENT",
        userId,
        newPermission,
        message: message || `Your permission on "${document.title}" has been updated to ${newPermission}`,
        timestamp: new Date().toISOString(),
        actorId,
      };

      // Broadcast to the specific user - targeting handled by room management
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.PERMISSION_UPDATED,
        workspaceId: document.workspaceId,
        actorId,
        data: event,
        timestamp: event.timestamp,
      });

      console.log(`Permission change broadcasted for user ${userId} on document ${docId}: ${newPermission}`);
    } catch (error) {
      console.error(`Error broadcasting permission change:`, error);
      throw error;
    }
  }

  /**
   * Revoke user access and notify them immediately
   */
  async revokeUserAccess(docId: string, userId: string, actorId: string, reason?: string): Promise<void> {
    try {
      // Get document info
      const document = await this.prismaService.doc.findUnique({
        where: { id: docId },
        select: { workspaceId: true, title: true },
      });

      if (!document) {
        console.warn(`Document ${docId} not found for access revocation`);
        return;
      }

      const event: PermissionUpdateEvent = {
        type: "ACCESS_REVOKED",
        resourceId: docId,
        resourceType: "DOCUMENT",
        userId,
        message: reason || `Your access to "${document.title}" has been revoked`,
        timestamp: new Date().toISOString(),
        actorId,
      };

      // Broadcast to the specific user
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.ACCESS_REVOKED,
        workspaceId: document.workspaceId,
        actorId,
        data: event,
        timestamp: event.timestamp,
      });

      console.log(`Access revoked and broadcasted for user ${userId} on document ${docId}`);
    } catch (error) {
      console.error(`Error revoking user access:`, error);
      throw error;
    }
  }

  /**
   * Notify user about new document share
   */
  async notifyDocumentShared(
    docId: string,
    userId: string,
    permission: PermissionLevel,
    actorId: string,
    shareType: "DIRECT" | "GROUP" = "DIRECT",
  ): Promise<void> {
    try {
      // Get document and actor info
      const [document, actor] = await Promise.all([
        this.prismaService.doc.findUnique({
          where: { id: docId },
          select: { workspaceId: true, title: true },
        }),
        this.prismaService.user.findUnique({
          where: { id: actorId },
          select: { displayName: true, email: true },
        }),
      ]);

      if (!document) {
        console.warn(`Document ${docId} not found for share notification`);
        return;
      }

      const actorName = actor?.displayName || actor?.email || "Someone";
      const shareMessage =
        shareType === "GROUP"
          ? `${actorName} shared "${document.title}" with your group (${permission} access)`
          : `${actorName} shared "${document.title}" with you (${permission} access)`;

      const event: PermissionUpdateEvent = {
        type: "DOCUMENT_SHARED",
        resourceId: docId,
        resourceType: "DOCUMENT",
        userId,
        newPermission: permission,
        message: shareMessage,
        timestamp: new Date().toISOString(),
        actorId,
      };

      // Broadcast to the specific user
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.DOCUMENT_SHARED,
        workspaceId: document.workspaceId,
        actorId,
        data: event,
        timestamp: event.timestamp,
      });

      console.log(`Document share notification sent to user ${userId} for document ${docId}: ${permission}`);
    } catch (error) {
      console.error(`Error notifying document share:`, error);
      throw error;
    }
  }

  /**
   * Notify users about subspace permission updates
   */
  async notifySubspacePermissionUpdate(
    subspaceId: string,
    affectedUserIds: string[],
    actorId: string,
    updateType: "ADMIN_PERMISSION" | "MEMBER_PERMISSION" | "NON_MEMBER_PERMISSION" | "TYPE_CHANGE",
    newPermission?: PermissionLevel,
  ): Promise<void> {
    try {
      // Get subspace info
      const subspace = await this.prismaService.subspace.findUnique({
        where: { id: subspaceId },
        select: { workspaceId: true, name: true, type: true },
      });

      if (!subspace) {
        console.warn(`Subspace ${subspaceId} not found for permission update notification`);
        return;
      }

      const updateMessages = {
        ADMIN_PERMISSION: `Admin permissions updated in "${subspace.name}"`,
        MEMBER_PERMISSION: `Member permissions updated in "${subspace.name}"`,
        NON_MEMBER_PERMISSION: `Non-member permissions updated in "${subspace.name}"`,
        TYPE_CHANGE: `Subspace "${subspace.name}" type changed to ${subspace.type}`,
      };

      const event: PermissionUpdateEvent = {
        type: "SUBSPACE_PERMISSION_UPDATED",
        resourceId: subspaceId,
        resourceType: "SUBSPACE",
        userId: "", // Will be set per user
        newPermission,
        message: updateMessages[updateType],
        timestamp: new Date().toISOString(),
        actorId,
      };

      // Broadcast to all affected users
      const broadcastPromises = affectedUserIds.map(async (userId) => {
        const userEvent = { ...event, userId };

        return this.eventPublisher.publishWebsocketEvent({
          name: BusinessEvents.SUBSPACE_PERMISSION_UPDATED,
          workspaceId: subspace.workspaceId,
          actorId,
          data: userEvent,
          timestamp: event.timestamp,
        });
      });

      await Promise.all(broadcastPromises);

      console.log(`Subspace permission update notifications sent to ${affectedUserIds.length} users for subspace ${subspaceId}`);
    } catch (error) {
      console.error(`Error notifying subspace permission update:`, error);
      throw error;
    }
  }

  /**
   * Notify users about permission updates with custom event data
   */
  async notifyPermissionUpdate(affectedUsers: string[], permissionUpdate: PermissionUpdateEvent, workspaceId: string): Promise<void> {
    try {
      // Debounce multiple rapid updates for the same resource
      const debounceKey = `${permissionUpdate.resourceType}:${permissionUpdate.resourceId}`;

      // Broadcast to all affected users
      const broadcastPromises = affectedUsers.map(async (userId) => {
        const userEvent = { ...permissionUpdate, userId };

        return this.eventPublisher.publishWebsocketEvent({
          name: this.getEventNameForType(permissionUpdate.type),
          workspaceId,
          actorId: permissionUpdate.actorId,
          data: userEvent,
          timestamp: permissionUpdate.timestamp,
        });
      });

      await Promise.all(broadcastPromises);

      console.log(`Permission update notifications sent to ${affectedUsers.length} users for ${permissionUpdate.resourceType} ${permissionUpdate.resourceId}`);
    } catch (error) {
      console.error(`Error sending permission update notifications:`, error);
      throw error;
    }
  }

  /**
   * Batch notify multiple users about permission changes
   * Useful for bulk operations like subspace permission changes
   */
  async batchNotifyPermissionChanges(
    updates: Array<{
      userId: string;
      docId: string;
      oldPermission: PermissionLevel;
      newPermission: PermissionLevel;
    }>,
    actorId: string,
    reason?: string,
  ): Promise<void> {
    try {
      // Group updates by workspace for efficient processing
      const updatesByWorkspace = new Map<string, typeof updates>();

      // Get all unique document IDs to fetch workspace info
      const docIds = [...new Set(updates.map((u) => u.docId))];
      const documents = await this.prismaService.doc.findMany({
        where: { id: { in: docIds } },
        select: { id: true, workspaceId: true, title: true },
      });

      const docMap = new Map(documents.map((doc) => [doc.id, doc]));

      // Group by workspace
      for (const update of updates) {
        const doc = docMap.get(update.docId);
        if (!doc) continue;

        if (!updatesByWorkspace.has(doc.workspaceId)) {
          updatesByWorkspace.set(doc.workspaceId, []);
        }
        updatesByWorkspace.get(doc.workspaceId)!.push(update);
      }

      // Process each workspace batch
      const allPromises: Promise<void>[] = [];

      updatesByWorkspace.forEach((workspaceUpdates, workspaceId) => {
        const workspacePromises = workspaceUpdates.map(async (update) => {
          const doc = docMap.get(update.docId)!;

          const event: PermissionUpdateEvent = {
            type: "PERMISSION_CHANGED",
            resourceId: update.docId,
            resourceType: "DOCUMENT",
            userId: update.userId,
            newPermission: update.newPermission,
            message: reason || `Your permission on "${doc.title}" changed from ${update.oldPermission} to ${update.newPermission}`,
            timestamp: new Date().toISOString(),
            actorId,
          };

          return this.eventPublisher.publishWebsocketEvent({
            name: BusinessEvents.PERMISSION_UPDATED,
            workspaceId,
            actorId,
            data: event,
            timestamp: event.timestamp,
          });
        });

        allPromises.push(...workspacePromises);
      });

      await Promise.all(allPromises);

      console.log(`Batch permission change notifications sent for ${updates.length} updates`);
    } catch (error) {
      console.error(`Error sending batch permission notifications:`, error);
      throw error;
    }
  }

  /**
   * Get affected users for a specific resource
   * Used to determine who should receive permission update notifications
   */
  async getAffectedUsersForResource(resourceType: ResourceType, resourceId: string): Promise<string[]> {
    try {
      const userIds = new Set<string>();

      // Get all users with direct permissions on this resource
      const permissions = await this.prismaService.unifiedPermission.findMany({
        where: {
          resourceType,
          resourceId,
        },
        select: { userId: true },
      });

      permissions.forEach((perm) => {
        if (perm.userId) userIds.add(perm.userId);
      });

      // For documents, also get users from parent contexts
      if (resourceType === ResourceType.DOCUMENT) {
        const document = await this.prismaService.doc.findUnique({
          where: { id: resourceId },
          select: { subspaceId: true, workspaceId: true },
        });

        if (document) {
          // Get subspace members
          if (document.subspaceId) {
            const subspaceMembers = await this.prismaService.subspaceMember.findMany({
              where: { subspaceId: document.subspaceId },
              select: { userId: true },
            });
            subspaceMembers.forEach((member) => userIds.add(member.userId));
          }

          // Get workspace members
          const workspaceMembers = await this.prismaService.workspaceMember.findMany({
            where: { workspaceId: document.workspaceId },
            select: { userId: true },
          });
          workspaceMembers.forEach((member) => userIds.add(member.userId));
        }
      }

      return Array.from(userIds);
    } catch (error) {
      console.error(`Error getting affected users for resource:`, error);
      return [];
    }
  }

  /**
   * Map permission update type to WebSocket event name
   */
  private getEventNameForType(type: PermissionUpdateEvent["type"]): BusinessEvents {
    const eventMap: Record<PermissionUpdateEvent["type"], BusinessEvents> = {
      PERMISSION_CHANGED: BusinessEvents.PERMISSION_UPDATED,
      ACCESS_REVOKED: BusinessEvents.ACCESS_REVOKED,
      DOCUMENT_SHARED: BusinessEvents.DOCUMENT_SHARED,
      SUBSPACE_PERMISSION_UPDATED: BusinessEvents.SUBSPACE_PERMISSION_UPDATED,
    };

    return eventMap[type] || BusinessEvents.PERMISSION_UPDATED;
  }

  /**
   * Check if user is currently collaborating on a document
   * Used to handle permission changes during active collaboration
   */
  async isUserCollaborating(userId: string, docId: string): Promise<boolean> {
    try {
      // This would integrate with your collaboration service
      // For now, we'll implement a simple check
      // You might have a different way to track active collaborators

      // Placeholder implementation - you might want to check:
      // - Active WebSocket connections
      // - Recent document activity
      // - Collaboration session data

      return false; // Implement based on your collaboration system
    } catch (error) {
      console.error(`Error checking collaboration status:`, error);
      return false;
    }
  }

  /**
   * Handle permission change during active collaboration
   * Gracefully manage user experience when permissions change mid-session
   */
  async handleCollaborationPermissionChange(
    userId: string,
    docId: string,
    oldPermission: PermissionLevel,
    newPermission: PermissionLevel,
    actorId: string,
  ): Promise<void> {
    try {
      const isCollaborating = await this.isUserCollaborating(userId, docId);

      if (!isCollaborating) {
        // User not actively collaborating, just send normal notification
        await this.broadcastPermissionChange(docId, userId, newPermission, actorId);
        return;
      }

      // User is actively collaborating, handle gracefully
      const document = await this.prismaService.doc.findUnique({
        where: { id: docId },
        select: { workspaceId: true, title: true },
      });

      if (!document) return;

      let message: string;
      let eventType: PermissionUpdateEvent["type"];

      if (newPermission === PermissionLevel.NONE) {
        // Access completely revoked during collaboration
        message = `Your access to "${document.title}" has been revoked. Please save your work and close the document.`;
        eventType = "ACCESS_REVOKED";
      } else if (this.isPermissionDowngrade(oldPermission, newPermission)) {
        // Permission downgraded during collaboration
        message = `Your permission on "${document.title}" has been changed to ${newPermission}. Some features may no longer be available.`;
        eventType = "PERMISSION_CHANGED";
      } else {
        // Permission upgraded during collaboration
        message = `Your permission on "${document.title}" has been upgraded to ${newPermission}. New features are now available.`;
        eventType = "PERMISSION_CHANGED";
      }

      const event: PermissionUpdateEvent = {
        type: eventType,
        resourceId: docId,
        resourceType: "DOCUMENT",
        userId,
        newPermission: newPermission !== PermissionLevel.NONE ? newPermission : undefined,
        message,
        timestamp: new Date().toISOString(),
        actorId,
      };

      await this.eventPublisher.publishWebsocketEvent({
        name: this.getEventNameForType(eventType),
        workspaceId: document.workspaceId,
        actorId,
        data: event,
        timestamp: event.timestamp,
      });

      console.log(`Collaboration permission change handled for user ${userId} on document ${docId}: ${oldPermission} -> ${newPermission}`);
    } catch (error) {
      console.error(`Error handling collaboration permission change:`, error);
      throw error;
    }
  }

  /**
   * Check if permission change is a downgrade
   */
  private isPermissionDowngrade(oldPermission: PermissionLevel, newPermission: PermissionLevel): boolean {
    const hierarchy = {
      [PermissionLevel.NONE]: 0,
      [PermissionLevel.READ]: 1,
      [PermissionLevel.COMMENT]: 2,
      [PermissionLevel.EDIT]: 3,
      [PermissionLevel.MANAGE]: 4,
      [PermissionLevel.OWNER]: 5,
    };

    return hierarchy[oldPermission] > hierarchy[newPermission];
  }
}
