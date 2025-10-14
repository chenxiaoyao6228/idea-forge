import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { PolicyGuard } from "@/_shared/casl/policy.guard";
import type { ListNotificationsRequest, MarkAsReadRequest, BatchMarkViewedRequest, ResolveActionRequest, UnreadCountRequest } from "@idea/contracts";

@UseGuards(PolicyGuard)
@Controller("/api/notifications")
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /api/notifications
   * List notifications for the current user
   */
  @Get()
  async listNotifications(
    @GetUser("id") userId: string,
    @Query("category") category?: string,
    @Query("read") read?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const dto: ListNotificationsRequest = {
      category: category as any,
      read: read === "true" ? true : read === "false" ? false : undefined,
      page: page ? Number.parseInt(page, 10) : 1,
      limit: limit ? Number.parseInt(limit, 10) : 20,
    };

    return this.notificationService.listNotifications(userId, dto);
  }

  /**
   * POST /api/notifications/:id/read
   * Mark a notification as read (explicit user click)
   */
  @Post(":id/read")
  async markAsRead(@GetUser("id") userId: string, @Param("id") notificationId: string) {
    return this.notificationService.markAsRead(userId, notificationId);
  }

  /**
   * POST /api/notifications/batch-viewed
   * Batch mark notifications as viewed (viewport tracking)
   */
  @Post("batch-viewed")
  async batchMarkViewed(@GetUser("id") userId: string, @Body() dto: BatchMarkViewedRequest) {
    return this.notificationService.batchMarkViewed(userId, dto.notificationIds);
  }

  /**
   * POST /api/notifications/:id/resolve
   * Resolve an action-required notification
   */
  @Post(":id/resolve")
  async resolveAction(@GetUser("id") userId: string, @Param("id") notificationId: string, @Body() dto: ResolveActionRequest) {
    return this.notificationService.resolveAction(userId, notificationId, dto.action, dto.reason);
  }

  /**
   * GET /api/notifications/unread-count
   * Get unread notification count
   */
  @Get("unread-count")
  async getUnreadCount(@GetUser("id") userId: string, @Query("category") category?: string) {
    const dto: UnreadCountRequest = { category: category as any };
    return this.notificationService.getUnreadCount(userId, dto.category);
  }

  /**
   * POST /api/notifications/dev/create
   * Development-only endpoint to create a notification
   * ONLY enabled in development environment
   */
  @Post("dev/create")
  async createNotificationDev(@Body() body: any) {
    // Early return if not in development
    if (process.env.NODE_ENV === "production") {
      return {
        success: false,
        message: "This endpoint is only available in development environment",
      };
    }

    const notification = await this.notificationService.createNotification(body);
    return {
      success: true,
      data: notification,
    };
  }
}
