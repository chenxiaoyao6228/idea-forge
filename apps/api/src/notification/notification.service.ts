import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";
import { EventDeduplicator } from "@/_shared/queues/helpers/event-deduplicator";
import type {
  ListNotificationsRequest,
  ListNotificationsResponse,
  MarkAsReadResponse,
  BatchMarkViewedResponse,
  ResolveActionResponse,
  UnreadCountResponse,
  NotificationCategory,
  NotificationEventType,
} from "@idea/contracts";
import { getCategoryEventTypes } from "@idea/contracts";

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventPublisher: EventPublisherService,
    private readonly eventDeduplicator: EventDeduplicator,
  ) {}

  /**
   * List notifications for a user with optional filtering
   */
  async listNotifications(userId: string, dto: ListNotificationsRequest): Promise<ListNotificationsResponse> {
    const { category, read, page = 1, limit = 20 } = dto;

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

    // Use unified pagination method with custom ordering
    // Sort unread notifications (viewedAt IS NULL) first, then by creation date
    // @ts-ignore
    const result = await this.prisma.notification.paginateWithApiFormat({
      where,
      orderBy: [
        { viewedAt: { sort: "asc", nulls: "first" } }, // Unread (NULL) notifications first
        { createdAt: "desc" }, // Within each group, sort by newest first
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

    // TODO: Trigger actual permission/invitation handling based on notification type
    // This will be implemented in Phase 3 when integrating with existing permission/workspace modules

    return {
      success: true,
      notification: updated,
      message: `Action ${action} processed successfully`,
    };
  }

  /**
   * Get unread notification count (overall and by category)
   */
  async getUnreadCount(userId: string, category?: NotificationCategory): Promise<UnreadCountResponse> {
    // Base filter for unread notifications
    const baseWhere = {
      userId,
      viewedAt: null,
    };

    // Get total unread count
    const total = await this.prisma.notification.count({
      where: baseWhere,
    });

    // Get counts by category
    const byCategory = {
      MENTIONS: 0,
      SHARING: 0,
      INBOX: 0,
      SUBSCRIBE: 0,
    };

    // Only count SHARING category in Phase 1
    const sharingEventTypes = getCategoryEventTypes("SHARING");
    if (sharingEventTypes.length > 0) {
      byCategory.SHARING = await this.prisma.notification.count({
        where: {
          ...baseWhere,
          event: { in: sharingEventTypes },
        },
      });
    }

    return {
      total,
      byCategory,
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

    // TODO: Publish WebSocket event via event processor
    // This will be implemented when connecting to the event queue system

    return notification;
  }
}
