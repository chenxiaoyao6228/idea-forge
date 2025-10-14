import request from "@/lib/request";
import type {
  ListNotificationsRequest,
  ListNotificationsResponse,
  MarkAsReadRequest,
  MarkAsReadResponse,
  BatchMarkViewedRequest,
  BatchMarkViewedResponse,
  ResolveActionRequest,
  ResolveActionResponse,
  UnreadCountRequest,
  UnreadCountResponse,
} from "@idea/contracts";

export const notificationApi = {
  /**
   * List notifications for the current user
   */
  list: async (params: ListNotificationsRequest) => request.get<ListNotificationsRequest, ListNotificationsResponse>("/api/notifications", { params }),

  /**
   * Mark a notification as read (explicit user click)
   */
  markAsRead: async (notificationId: string) => request.post<void, MarkAsReadResponse>(`/api/notifications/${notificationId}/read`),

  /**
   * Batch mark notifications as viewed (viewport tracking)
   */
  batchMarkViewed: async (data: BatchMarkViewedRequest) =>
    request.post<BatchMarkViewedRequest, BatchMarkViewedResponse>("/api/notifications/batch-viewed", data),

  /**
   * Resolve an action-required notification
   */
  resolveAction: async (notificationId: string, data: ResolveActionRequest) =>
    request.post<ResolveActionRequest, ResolveActionResponse>(`/api/notifications/${notificationId}/resolve`, data),

  /**
   * Get unread notification count
   */
  getUnreadCount: async (params?: UnreadCountRequest) =>
    request.get<UnreadCountRequest, UnreadCountResponse>("/api/notifications/unread-count", {
      params: params || {},
    }),
};
