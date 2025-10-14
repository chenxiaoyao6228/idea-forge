import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";
import useRequest from "@ahooksjs/use-request";
import type { Notification, NotificationCategory, UnreadCountResponse, PaginationMetadata } from "@idea/contracts";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { notificationApi } from "@/apis/notification";

// Notification entity extended from contract
export type NotificationEntity = Notification;

// Minimal store - only state
const useNotificationStore = create<{
  notifications: NotificationEntity[];
  unreadCount: UnreadCountResponse | null;
  loading: boolean;
  pagination: PaginationMetadata | null;
}>(() => ({
  notifications: [],
  unreadCount: null,
  loading: false,
  pagination: null,
}));

// Basic data access
export const useNotifications = () => {
  return useNotificationStore((state) => state.notifications);
};

export const useUnreadCount = () => {
  return useNotificationStore((state) => state.unreadCount);
};

export const useNotificationsLoading = () => {
  return useNotificationStore((state) => state.loading);
};

export const useNotificationsPagination = () => {
  return useNotificationStore((state) => state.pagination);
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

export const removeNotification = (id: string) => {
  useNotificationStore.setState((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id),
  }));
};

export const setUnreadCount = (unreadCount: UnreadCountResponse) => {
  useNotificationStore.setState({ unreadCount });
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
    unreadCount: null,
    loading: false,
  });
};

// ============================================
// API Request Hooks
// ============================================

/**
 * Fetch notifications with optional filtering (page-based pagination)
 */
export const useFetchNotifications = (category?: NotificationCategory, read?: boolean, page = 1, append = false) => {
  return useRequest(
    async () => {
      try {
        setLoading(true);
        const response = await notificationApi.list({
          category,
          read,
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
      refreshDeps: [category, read, page],
    },
  );
};

/**
 * Fetch unread count
 */
export const useFetchUnreadCount = () => {
  return useRequest(
    async () => {
      try {
        const response = await notificationApi.getUnreadCount();
        setUnreadCount(response);
        return response;
      } catch (error: any) {
        console.error("Failed to fetch unread count:", error);
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

        // Refetch unread count
        const countResponse = await notificationApi.getUnreadCount();
        setUnreadCount(countResponse);

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

        // Refetch unread count
        const countResponse = await notificationApi.getUnreadCount();
        setUnreadCount(countResponse);

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

        // Refetch unread count
        const countResponse = await notificationApi.getUnreadCount();
        setUnreadCount(countResponse);

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

/**
 * Hook for viewport tracking - auto-marks informational notifications as viewed
 * Uses Intersection Observer to detect when notifications enter viewport
 */
export const useNotificationViewportTracking = () => {
  const batchMarkViewed = useBatchMarkViewed();

  return useRefCallback((notificationIds: string[]) => {
    if (notificationIds.length === 0) return;

    // Debounce and batch viewport tracking
    // Wait 2 seconds after notification enters viewport before marking as viewed
    const timeoutId = setTimeout(() => {
      batchMarkViewed.run(notificationIds);
    }, 2000);

    return () => clearTimeout(timeoutId);
  });
};

/**
 * Get notification badge count (for UI display)
 */
export const useNotificationBadgeCount = () => {
  const unreadCount = useUnreadCount();
  return unreadCount?.total || 0;
};

/**
 * Get category-specific unread counts
 */
export const useCategoryUnreadCount = (category: NotificationCategory) => {
  const unreadCount = useUnreadCount();
  return unreadCount?.byCategory[category] || 0;
};

export default useNotificationStore;
