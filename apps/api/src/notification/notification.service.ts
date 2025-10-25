import { Injectable, forwardRef, Inject, Logger } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { DocumentService } from "@/document/document.service";
import { WorkspaceService } from "@/workspace/workspace.service";
import { NotificationSettingService } from "./notification-setting.service";
import {
  NotificationEventType,
  type ListNotificationsRequest,
  type ListNotificationsResponse,
  type MarkAsReadResponse,
  type BatchMarkViewedResponse,
  type MarkAllAsReadResponse,
  type ResolveActionResponse,
  type UnreadCountByWorkspaceResponse,
  type NotificationCategory,
  type WorkspaceRole,
} from "@idea/contracts";
import { getCategoryEventTypes, SPECIAL_WORKSPACE_ID } from "@idea/contracts";
import { BusinessEvents } from "@/_shared/socket/business-event.constant";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly notificationSettingService: NotificationSettingService,
    @Inject(forwardRef(() => DocumentService))
    private readonly documentService: DocumentService,
    @Inject(forwardRef(() => WorkspaceService))
    private readonly workspaceService: WorkspaceService,
  ) {}

  /**
   * List notifications for a user with optional filtering
   */
  async listNotifications(userId: string, dto: ListNotificationsRequest): Promise<ListNotificationsResponse> {
    const { category, read, workspaceId, page = 1, limit = 20 } = dto;

    // Build filter conditions
    const where: any = { userId };

    // Filter by category (map to event types)
    if (category) {
      const eventTypes = getCategoryEventTypes(category);
      if (eventTypes.length > 0) {
        where.event = { in: eventTypes };
      } else {
        // No event types for this category in Phase 1, return empty
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            pageCount: 0,
          },
        };
      }
    }

    // Filter by read/unread status
    if (read !== undefined) {
      where.viewedAt = read ? { not: null } : null;
    }

    // Filter by workspace (includes cross-workspace notifications)
    if (workspaceId) {
      where.OR = [
        { workspaceId: workspaceId }, // Current workspace notifications
        { workspaceId: SPECIAL_WORKSPACE_ID }, // Cross-workspace notifications
      ];
    }

    // Use unified pagination method with custom ordering
    // Sort by creation date (newest first) for all notifications
    // @ts-ignore
    const result = await this.prisma.notification.paginateWithApiFormat({
      where,
      orderBy: [
        { createdAt: "desc" }, // Sort by newest first
      ],
      page,
      limit,
    });

    return result;
  }

  /**
   * Mark a single notification as read (explicit user click)
   */
  async markAsRead(userId: string, notificationId: string): Promise<MarkAsReadResponse> {
    // Verify notification belongs to user
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound);
    }

    // Update viewedAt if not already viewed
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        viewedAt: notification.viewedAt || new Date(),
      },
    });

    // Publish WebSocket event for notification update
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.NOTIFICATION_UPDATE,
      workspaceId: notification.workspaceId,
      actorId: userId,
      data: {
        type: "notification.update",
        payload: updated,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      notification: updated,
    };
  }

  /**
   * Batch mark notifications as viewed (viewport tracking)
   */
  async batchMarkViewed(userId: string, notificationIds: string[]): Promise<BatchMarkViewedResponse> {
    // Update all unviewed notifications in the batch
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
        viewedAt: null, // Only update unviewed
      },
      data: {
        viewedAt: new Date(),
      },
    });

    return {
      success: true,
      markedCount: result.count,
    };
  }

  /**
   * Mark all notifications as read with optional filtering by category and workspace
   */
  async markAllAsRead(userId: string, category?: NotificationCategory, workspaceId?: string): Promise<MarkAllAsReadResponse> {
    // Build filter conditions
    const where: any = {
      userId,
      viewedAt: null, // Only mark unread notifications
    };

    // Filter by category (map to event types)
    if (category) {
      const eventTypes = getCategoryEventTypes(category);
      if (eventTypes.length > 0) {
        where.event = { in: eventTypes };
      } else {
        // No event types for this category in Phase 1, return 0
        return {
          success: true,
          markedCount: 0,
        };
      }
    }

    // Filter by workspace (includes cross-workspace notifications)
    if (workspaceId) {
      where.OR = [
        { workspaceId: workspaceId }, // Current workspace notifications
        { workspaceId: SPECIAL_WORKSPACE_ID }, // Cross-workspace notifications
      ];
    }

    // Update all matching unread notifications
    const result = await this.prisma.notification.updateMany({
      where,
      data: {
        viewedAt: new Date(),
      },
    });

    return {
      success: true,
      markedCount: result.count,
    };
  }

  /**
   * Resolve an action-required notification (approve/reject, accept/decline)
   */
  async resolveAction(userId: string, notificationId: string, action: string, reason?: string): Promise<ResolveActionResponse> {
    // Verify notification belongs to user and requires action
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
        actionRequired: true,
        actionStatus: "PENDING",
      },
    });

    if (!notification) {
      throw new ApiException(ErrorCodeEnum.ResourceNotFound, 404, "Notification not found or already resolved");
    }

    // Determine new status based on action
    let newStatus: "APPROVED" | "REJECTED";
    if (action === "approve" || action === "accept") {
      newStatus = "APPROVED";
    } else if (action === "reject" || action === "decline") {
      newStatus = "REJECTED";
    } else {
      throw new ApiException(ErrorCodeEnum.PermissionDenied, 400, "Invalid action");
    }

    // Update notification
    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        actionStatus: newStatus,
        actionResolvedAt: new Date(),
        actionResolvedBy: userId,
        viewedAt: notification.viewedAt || new Date(), // Mark as viewed
      },
    });

    // Cancel all other pending notifications for the same request
    // This prevents other admins from approving/rejecting after one admin has already acted
    if (notification.actionPayload && typeof notification.actionPayload === "object") {
      const payload = notification.actionPayload as any;
      const requestId = payload.requestId;

      if (requestId) {
        // Find all other PENDING notifications with the same requestId
        const relatedNotifications = await this.prisma.notification.findMany({
          where: {
            id: { not: notificationId }, // Exclude current notification
            actionPayload: {
              path: ["requestId"],
              equals: requestId,
            },
            actionStatus: "PENDING",
            actionRequired: true,
          },
        });

        // Update all related notifications to CANCELED
        if (relatedNotifications.length > 0) {
          await this.prisma.notification.updateMany({
            where: {
              id: { in: relatedNotifications.map((n) => n.id) },
            },
            data: {
              actionStatus: "CANCELED",
              actionResolvedAt: new Date(),
              actionResolvedBy: userId, // Who resolved the original request
              viewedAt: new Date(), // Mark as viewed
            },
          });

          // Publish WebSocket events to notify other admins that the request was already handled
          for (const relatedNotif of relatedNotifications) {
            await this.eventPublisher.publishWebsocketEvent({
              name: BusinessEvents.NOTIFICATION_UPDATE,
              workspaceId: relatedNotif.workspaceId,
              actorId: userId,
              data: {
                type: "notification.update",
                payload: {
                  ...relatedNotif,
                  actionStatus: "CANCELED",
                  actionResolvedAt: new Date(),
                  actionResolvedBy: userId,
                  viewedAt: new Date(),
                },
              },
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    }

    // Execute actual business logic if approved
    if (newStatus === "APPROVED") {
      await this.executeApprovedAction(notification);
    } else if (newStatus === "REJECTED" && notification.actionType === "PERMISSION_REQUEST") {
      // Send rejection notification to the requester
      const { documentId, permission, requesterId } = notification.actionPayload as any;

      if (documentId && requesterId) {
        const [document, admin] = await Promise.all([
          this.prisma.doc.findUnique({
            where: { id: documentId },
            select: { title: true },
          }),
          this.prisma.user.findUnique({
            where: { id: userId },
            select: { displayName: true, email: true },
          }),
        ]);

        if (document && admin) {
          await this.createNotification({
            userId: requesterId, // Send to the requester
            event: NotificationEventType.PERMISSION_REJECT,
            workspaceId: notification.workspaceId,
            actorId: userId, // The admin who rejected
            documentId: documentId,
            metadata: {
              requestedPermission: permission,
              documentTitle: document.title,
              documentId: documentId,
              actorName: admin.displayName || admin.email,
              reason: reason,
            },
            actionRequired: false,
          });
        }
      }
    }

    // Publish WebSocket event for action resolution
    await this.eventPublisher.publishWebsocketEvent({
      name: BusinessEvents.NOTIFICATION_ACTION_RESOLVED,
      workspaceId: notification.workspaceId,
      actorId: userId,
      data: {
        type: "notification.action_resolved",
        payload: updated,
      },
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      notification: updated,
      message: `Action ${action} processed successfully`,
    };
  }

  /**
   * Execute the actual business operation for approved actions
   */
  private async executeApprovedAction(notification: any): Promise<void> {
    const { actionType, actionPayload, userId, actorId, workspaceId } = notification;

    if (!actionType || !actionPayload) {
      return;
    }

    try {
      switch (actionType) {
        case "PERMISSION_REQUEST":
          await this.handleDocumentPermissionRequest(actionPayload, userId, actorId, workspaceId);
          break;
        case "WORKSPACE_INVITATION":
          await this.handleWorkspaceInvitation(actionPayload, userId, actorId || userId);
          break;
        default:
          throw new Error(`Unknown action type: ${actionType}`);
      }
    } catch (error) {
      // Log error but don't fail the notification update
      console.error(`Failed to execute approved action for notification ${notification.id}:`, error);
      throw error;
    }
  }

  /**
   * Get unread notification count grouped by workspace
   * Used for cross-workspace notification badges
   */
  async getUnreadCountByWorkspace(userId: string): Promise<UnreadCountByWorkspaceResponse> {
    // Base filter for unread notifications
    const baseWhere = {
      userId,
      viewedAt: null,
    };

    // Get all unread notifications grouped by workspace
    const notifications = await this.prisma.notification.findMany({
      where: baseWhere,
      select: {
        workspaceId: true,
        event: true,
      },
    });

    // Initialize result structure
    const byWorkspace: Record<string, { MENTIONS: number; SHARING: number; INBOX: number; SUBSCRIBE: number }> = {};
    const crossWorkspace = {
      MENTIONS: 0,
      SHARING: 0,
      INBOX: 0,
      SUBSCRIBE: 0,
    };

    // Helper function to determine category from event type
    const getCategory = (event: string): NotificationCategory | null => {
      const sharingEvents = getCategoryEventTypes("SHARING");
      const mentionsEvents = getCategoryEventTypes("MENTIONS");
      const inboxEvents = getCategoryEventTypes("INBOX");
      const subscribeEvents = getCategoryEventTypes("SUBSCRIBE");

      if (sharingEvents.includes(event as NotificationEventType)) return "SHARING";
      if (mentionsEvents.includes(event as NotificationEventType)) return "MENTIONS";
      if (inboxEvents.includes(event as NotificationEventType)) return "INBOX";
      if (subscribeEvents.includes(event as NotificationEventType)) return "SUBSCRIBE";

      return null;
    };

    // Group notifications by workspace and category
    for (const notification of notifications) {
      const category = getCategory(notification.event);
      if (!category) continue; // Skip unknown categories

      if (notification.workspaceId === SPECIAL_WORKSPACE_ID) {
        // Cross-workspace notification
        crossWorkspace[category]++;
      } else {
        // Workspace-scoped notification
        if (!byWorkspace[notification.workspaceId]) {
          byWorkspace[notification.workspaceId] = {
            MENTIONS: 0,
            SHARING: 0,
            INBOX: 0,
            SUBSCRIBE: 0,
          };
        }
        byWorkspace[notification.workspaceId][category]++;
      }
    }

    return {
      byWorkspace,
      crossWorkspace,
    };
  }

  /**
   * Create a notification (called by other modules)
   */
  async createNotification(data: {
    userId: string;
    event: NotificationEventType;
    workspaceId: string;
    actorId?: string;
    documentId?: string;
    metadata?: Record<string, any>;
    actionRequired?: boolean;
    actionType?: "PERMISSION_REQUEST" | "WORKSPACE_INVITATION" | "SUBSPACE_INVITATION";
    actionPayload?: Record<string, any>;
  }) {
    this.logger.log(`[NOTIFICATION] Creating notification: event=${data.event}, userId=${data.userId}, actorId=${data.actorId}, documentId=${data.documentId}`);
    this.logger.log(`[DEBUG] Notification data:`, JSON.stringify(data));

    try {
      // Check user notification settings before creating notification
      const isEnabled = await this.notificationSettingService.isNotificationEnabled(data.userId, data.event);
      if (!isEnabled) {
        // User has disabled this notification type - skip creation
        this.logger.log(`[NOTIFICATION] User ${data.userId} has disabled ${data.event} notifications, skipping`);
        return null;
      }

      this.logger.log(`[DEBUG] User notification settings check passed, creating notification in database`);

      const notification = await this.prisma.notification.create({
        data: {
          userId: data.userId,
          event: data.event,
          workspaceId: data.workspaceId,
          actorId: data.actorId || null,
          documentId: data.documentId || null,
          metadata: data.metadata as any, // Prisma JSON type
          actionRequired: data.actionRequired || false,
          actionType: data.actionType || null,
          actionStatus: data.actionRequired ? "PENDING" : "APPROVED",
          actionPayload: data.actionPayload as any, // Prisma JSON type
        },
      });

      this.logger.log(`[NOTIFICATION] Notification created with ID: ${notification.id}`);

      // Publish WebSocket event to notify user in real-time
      this.logger.log(`[DEBUG] Publishing WebSocket event for notification ${notification.id}`);
      await this.eventPublisher.publishWebsocketEvent({
        name: BusinessEvents.NOTIFICATION_CREATE,
        workspaceId: data.workspaceId,
        actorId: data.actorId,
        data: {
          type: "notification.create",
          payload: notification,
        },
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`[NOTIFICATION] WebSocket event published for notification ${notification.id}`);

      return notification;
    } catch (error) {
      const err = error as any;
      this.logger.error(
        `[ERROR] Failed to create notification`,
        JSON.stringify({
          event: data.event,
          userId: data.userId,
          actorId: data.actorId,
          documentId: data.documentId,
          workspaceId: data.workspaceId,
          error: err?.message || String(error),
          errorCode: err?.code,
          errorStack: err?.stack,
        }),
      );
      throw error; // Re-throw for caller to handle
    }
  }
  // ================================ call other services =======================================================================

  /**
   * Handle approved permission request - grant document permission
   */
  private async handleDocumentPermissionRequest(payload: any, userId: string, actorId: string | undefined, workspaceId: string): Promise<void> {
    const { documentId, permission } = payload;

    if (!documentId || !permission || !actorId) {
      throw new Error("Missing required fields: documentId, permission, or actorId");
    }

    // Grant permission using DocumentService.shareDocument
    await this.documentService.shareDocument(userId, documentId, {
      workspaceId,
      permission,
      targetUserIds: [actorId], // Grant to the requester
      includeChildDocuments: true,
    });

    // Send notification back to the requester that their request was approved
    const [document, admin] = await Promise.all([
      this.prisma.doc.findUnique({
        where: { id: documentId },
        select: { title: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true, email: true },
      }),
    ]);

    if (document && admin) {
      await this.createNotification({
        userId: actorId, // Send to the requester
        event: NotificationEventType.PERMISSION_GRANT,
        workspaceId: workspaceId,
        actorId: userId, // The admin who approved
        documentId: documentId,
        metadata: {
          grantedPermission: permission,
          documentTitle: document.title,
          documentId: documentId,
          actorName: admin.displayName || admin.email,
        },
        actionRequired: false,
      });
    }
  }

  /**
   * Handle approved workspace invitation - add user to workspace
   */
  private async handleWorkspaceInvitation(payload: any, userId: string, adminId: string): Promise<void> {
    const { workspaceId, role = "MEMBER" as WorkspaceRole } = payload;

    if (!workspaceId) {
      throw new Error("Missing required field: workspaceId");
    }

    // Add user to workspace using WorkspaceService.addWorkspaceMember
    await this.workspaceService.addWorkspaceMember(workspaceId, userId, role, adminId);

    // Send notification back to the inviter (actorId) that the invitation was accepted
    if (adminId && adminId !== userId) {
      // Get the user and workspace info for the notification metadata
      const [user, workspace] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { displayName: true, email: true },
        }),
        this.prisma.workspace.findUnique({
          where: { id: workspaceId },
          select: { name: true },
        }),
      ]);

      if (user && workspace) {
        await this.createNotification({
          userId: adminId, // Send to the inviter
          event: NotificationEventType.PERMISSION_GRANT, // Reuse existing event type (invitation accepted)
          workspaceId: workspaceId, // Workspace-scoped notification
          actorId: userId, // The user who accepted
          metadata: {
            userName: user.displayName || user.email,
            workspaceName: workspace.name,
            message: `${user.displayName || user.email} has accepted your invitation and joined ${workspace.name}`,
          },
          actionRequired: false,
        });
      }
    }
  }
}
