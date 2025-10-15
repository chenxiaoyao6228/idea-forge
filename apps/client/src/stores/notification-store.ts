import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";
import useRequest from "@ahooksjs/use-request";
import type { Notification, NotificationCategory, UnreadCountByWorkspaceResponse, CategoryCounts, PaginationMetadata } from "@idea/contracts";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { notificationApi } from "@/apis/notification";
import { useCurrentWorkspace } from "./workspace-store";

// Notification entity extended from contract
export type NotificationEntity = Notification;

// Minimal store - only state
const useNotificationStore = create<{
  notifications: NotificationEntity[];
  unreadCountByWorkspace: UnreadCountByWorkspaceResponse | null;
  loading: boolean;
  pagination: PaginationMetadata | null;
  currentWorkspaceId: string | null;
}>(() => ({
  notifications: [],
  unreadCountByWorkspace: null,
  loading: false,
  pagination: null,
  currentWorkspaceId: null,
}));

export const useUnreadCountByWorkspace = () => {
  return useNotificationStore((state) => state.unreadCountByWorkspace);
};

/**
 * Compute overall unread count from workspace-specific data only
 * Filters out current workspace and only counts MENTIONS and INBOX categories
 */
export const useOtherWorkspacesTotalUnreadCount = () => {
  const currentWorkspaceId = useCurrentWorkspace()?.id;
  const unreadCountByWorkspace = useUnreadCountByWorkspace();
  return useMemo(() => {
    if (!unreadCountByWorkspace) return null;

    // Compute category counts by summing all workspaces except current workspace
    const byCategory: CategoryCounts = {
      MENTIONS: 0,
      SHARING: 0,
      INBOX: 0,
      SUBSCRIBE: 0,
    };

    // Sum workspace counts, filtering out current workspace
    Object.entries(unreadCountByWorkspace.byWorkspace)
      .filter(([workspaceId]) => workspaceId !== currentWorkspaceId)
      .forEach(([, counts]) => {
        byCategory.MENTIONS += counts.MENTIONS;
        byCategory.INBOX += counts.INBOX;
        byCategory.SHARING += counts.SHARING;
        byCategory.SUBSCRIBE += counts.SUBSCRIBE;
      });

    // Compute total from only MENTIONS and INBOX
    const total = byCategory.MENTIONS + byCategory.INBOX + byCategory.SHARING + byCategory.SUBSCRIBE;

    return {
      total,
      byCategory,
    };
  }, [unreadCountByWorkspace, currentWorkspaceId]);
};

export const useCurrentWorkspaceNotificationCount = () => {
  const currentWorkspaceId = useCurrentWorkspace()?.id;
  if (!currentWorkspaceId) return 0;
  const unreadCountByWorkspace = useUnreadCountByWorkspace();
  return useMemo(() => {
    if (!unreadCountByWorkspace) return 0;
    return (
      unreadCountByWorkspace.byWorkspace[currentWorkspaceId]?.MENTIONS +
      unreadCountByWorkspace.byWorkspace[currentWorkspaceId]?.INBOX +
      unreadCountByWorkspace.byWorkspace[currentWorkspaceId]?.SHARING +
      unreadCountByWorkspace.byWorkspace[currentWorkspaceId]?.SUBSCRIBE +
      unreadCountByWorkspace.crossWorkspace.MENTIONS +
      unreadCountByWorkspace.crossWorkspace.INBOX +
      unreadCountByWorkspace.crossWorkspace.SHARING +
      unreadCountByWorkspace.crossWorkspace.SUBSCRIBE
    );
  }, [unreadCountByWorkspace, currentWorkspaceId]);
};

// Computed values
export const useFilteredNotifications = (category?: NotificationCategory, read?: boolean) => {
  const notifications = useNotificationStore((state) => state.notifications);

  return useMemo(() => {
    let filtered = notifications;

    if (category) {
      // Filter by category would be based on event type mapping
      // For now, just return all for Phase 1
      filtered = notifications;
    }

    if (read !== undefined) {
      filtered = filtered.filter((n) => (read ? n.viewedAt !== null : n.viewedAt === null));
    }

    return filtered;
  }, [notifications, category, read]);
};

export const useUnreadNotifications = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  return useMemo(() => notifications.filter((n) => !n.viewedAt), [notifications]);
};

export const useActionRequiredNotifications = () => {
  const notifications = useNotificationStore((state) => state.notifications);
  return useMemo(() => notifications.filter((n) => n.actionRequired && n.actionStatus === "PENDING"), [notifications]);
};

// Store update helpers
export const setNotifications = (notifications: NotificationEntity[]) => {
  useNotificationStore.setState({ notifications });
};

export const addNotification = (notification: NotificationEntity) => {
  useNotificationStore.setState((state) => ({
    notifications: [notification, ...state.notifications],
  }));
};

export const addNotifications = (notifications: NotificationEntity[]) => {
  useNotificationStore.setState((state) => ({
    notifications: [...state.notifications, ...notifications],
  }));
};

export const updateNotification = (id: string, updates: Partial<NotificationEntity>) => {
  useNotificationStore.setState((state) => ({
    notifications: state.notifications.map((n) => (n.id === id ? { ...n, ...updates } : n)),
  }));
};

export const setUnreadCountByWorkspace = (unreadCountByWorkspace: UnreadCountByWorkspaceResponse) => {
  useNotificationStore.setState({ unreadCountByWorkspace });
};

export const setLoading = (loading: boolean) => {
  useNotificationStore.setState({ loading });
};

export const setPagination = (pagination: PaginationMetadata) => {
  useNotificationStore.setState({ pagination });
};

// Find notification by ID
export const useFindNotification = () => {
  const notifications = useNotificationStore((state) => state.notifications);

  return useRefCallback((id: string) => {
    return notifications.find((n) => n.id === id);
  });
};

// Batch mark as viewed helper (for viewport tracking)
export const markNotificationsAsViewed = (notificationIds: string[]) => {
  const now = new Date();
  useNotificationStore.setState((state) => ({
    notifications: state.notifications.map((n) => (notificationIds.includes(n.id) && !n.viewedAt ? { ...n, viewedAt: now } : n)),
  }));
};

// Mark single notification as read
export const markNotificationAsRead = (id: string) => {
  const now = new Date();
  useNotificationStore.setState((state) => ({
    notifications: state.notifications.map((n) => (n.id === id ? { ...n, viewedAt: now } : n)),
  }));
};

// Reset store (for logout)
export const resetNotificationStore = () => {
  useNotificationStore.setState({
    notifications: [],
    unreadCountByWorkspace: null,
    loading: false,
    pagination: null,
    currentWorkspaceId: null,
  });
};

// ============================================
// API Request Hooks
// ============================================

/**
 * Fetch notifications with optional filtering (page-based pagination)
 * When workspaceId is provided, returns both workspace-specific and cross-workspace notifications
 */
export const useFetchNotifications = (category?: NotificationCategory, read?: boolean, page = 1, append = false, workspaceId?: string) => {
  return useRequest(
    async () => {
      try {
        setLoading(true);
        const response = await notificationApi.list({
          category,
          read,
          workspaceId,
          page,
          limit: 5, // Standard page size
        });

        // For infinite scroll: append to existing, otherwise replace
        if (append && page > 1) {
          addNotifications(response.data);
        } else {
          setNotifications(response.data);
        }

        // Always update pagination metadata
        setPagination(response.pagination);

        return response;
      } catch (error: any) {
        console.error("Failed to fetch notifications:", error);
        toast.error("Failed to fetch notifications", {
          description: error.message,
        });
        throw error;
      } finally {
        setLoading(false);
      }
    },
    {
      manual: true,
      refreshDeps: [category, read, page, workspaceId],
    },
  );
};

/**
 * Fetch unread count grouped by workspace
 * This is the ONLY count fetch hook - it provides all notification count data
 * The overall unread count is computed from this workspace-grouped data
 */
export const useFetchUnreadCountByWorkspace = () => {
  return useRequest(
    async () => {
      try {
        const response = await notificationApi.getUnreadCountByWorkspace();
        setUnreadCountByWorkspace(response);
        return response;
      } catch (error: any) {
        console.error("Failed to fetch unread count by workspace:", error);
        // Silent failure for count
        throw error;
      }
    },
    {
      manual: true,
      pollingInterval: 30000, // Poll every 30 seconds
    },
  );
};

/**
 * Mark notification as read (explicit user click)
 */
export const useMarkAsRead = () => {
  return useRequest(
    async (notificationId: string) => {
      try {
        const response = await notificationApi.markAsRead(notificationId);

        // Update local store
        markNotificationAsRead(notificationId);

        // Refetch workspace-grouped unread count
        const countResponse = await notificationApi.getUnreadCountByWorkspace();
        setUnreadCountByWorkspace(countResponse);

        return response;
      } catch (error: any) {
        console.error("Failed to mark as read:", error);
        toast.error("Failed to mark as read", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

/**
 * Batch mark notifications as viewed (viewport tracking)
 * This is used for informational notifications that auto-read after being in viewport
 */
export const useBatchMarkViewed = () => {
  return useRequest(
    async (notificationIds: string[]) => {
      try {
        const response = await notificationApi.batchMarkViewed({ notificationIds });

        // Update local store
        markNotificationsAsViewed(notificationIds);

        // Refetch workspace-grouped unread count
        const countResponse = await notificationApi.getUnreadCountByWorkspace();
        setUnreadCountByWorkspace(countResponse);

        return response;
      } catch (error: any) {
        console.error("Failed to mark as viewed:", error);
        // Silent failure for viewport tracking
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

/**
 * Resolve action-required notification (approve/reject, accept/decline)
 */
export const useResolveAction = () => {
  return useRequest(
    async (params: { notificationId: string; action: "approve" | "reject" | "accept" | "decline"; reason?: string }) => {
      try {
        const { notificationId, action, reason } = params;
        const response = await notificationApi.resolveAction(notificationId, { notificationId, action, reason });

        // Update local store with new status
        updateNotification(notificationId, {
          actionStatus: action === "approve" || action === "accept" ? "APPROVED" : "REJECTED",
          actionResolvedAt: new Date(),
          viewedAt: new Date(),
        });

        // Refetch workspace-grouped unread count
        const countResponse = await notificationApi.getUnreadCountByWorkspace();
        setUnreadCountByWorkspace(countResponse);

        toast.success(`Action ${action} processed successfully`);

        return response;
      } catch (error: any) {
        console.error("Failed to resolve action:", error);
        toast.error("Failed to process action", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

export default useNotificationStore;
