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
  UnreadCountByWorkspaceResponse,
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
   * Get unread notification count grouped by workspace
   * Used for cross-workspace notification badges
   */
  getUnreadCountByWorkspace: async () => request.get<void, UnreadCountByWorkspaceResponse>("/api/notifications/unread-count-by-workspace"),
};
