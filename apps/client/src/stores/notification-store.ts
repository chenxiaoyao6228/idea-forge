import { create } from "zustand";
import { useMemo, useState, useCallback } from "react";
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
  pagination: PaginationMetadata | null;
  currentWorkspaceId: string | null;
}>(() => ({
  notifications: [],
  unreadCountByWorkspace: null,
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
  const unreadCountByWorkspace = useUnreadCountByWorkspace();

  return useMemo(() => {
    // Early return inside useMemo instead of before it (to follow Rules of Hooks)
    if (!currentWorkspaceId || !unreadCountByWorkspace) return 0;

    const workspaceCounts = unreadCountByWorkspace.byWorkspace?.[currentWorkspaceId];
    const crossWorkspaceCounts = unreadCountByWorkspace.crossWorkspace;

    // Provide default values if counts don't exist
    const safeWorkspaceCounts = workspaceCounts || {
      MENTIONS: 0,
      INBOX: 0,
      SHARING: 0,
      SUBSCRIBE: 0,
    };

    const safeCrossWorkspaceCounts = crossWorkspaceCounts || {
      MENTIONS: 0,
      INBOX: 0,
      SHARING: 0,
      SUBSCRIBE: 0,
    };

    return (
      (safeWorkspaceCounts.MENTIONS || 0) +
      (safeWorkspaceCounts.INBOX || 0) +
      (safeWorkspaceCounts.SHARING || 0) +
      (safeWorkspaceCounts.SUBSCRIBE || 0) +
      (safeCrossWorkspaceCounts.MENTIONS || 0) +
      (safeCrossWorkspaceCounts.INBOX || 0) +
      (safeCrossWorkspaceCounts.SHARING || 0) +
      (safeCrossWorkspaceCounts.SUBSCRIBE || 0)
    );
  }, [unreadCountByWorkspace, currentWorkspaceId]);
};

/**
 * Get unread counts for current workspace by category
 * Used for notification panel tab badges
 */
export const useCurrentWorkspaceUnreadByCategory = () => {
  const currentWorkspace = useCurrentWorkspace();
  const unreadCountByWorkspace = useUnreadCountByWorkspace();

  return useMemo(() => {
    if (!unreadCountByWorkspace || !currentWorkspace) {
      return {
        MENTIONS: 0,
        SHARING: 0,
        INBOX: 0,
        SUBSCRIBE: 0,
      };
    }

    // Get workspace-specific counts
    const workspaceCounts = unreadCountByWorkspace.byWorkspace[currentWorkspace.id] || {
      MENTIONS: 0,
      SHARING: 0,
      INBOX: 0,
      SUBSCRIBE: 0,
    };

    // INBOX and SUBSCRIBE include cross-workspace notifications
    // (workspace invitations, global subscriptions)
    const crossWorkspaceCounts = unreadCountByWorkspace.crossWorkspace || {
      MENTIONS: 0,
      SHARING: 0,
      INBOX: 0,
      SUBSCRIBE: 0,
    };

    return {
      MENTIONS: workspaceCounts.MENTIONS || 0,
      SHARING: workspaceCounts.SHARING || 0,
      INBOX: (workspaceCounts.INBOX || 0) + (crossWorkspaceCounts.INBOX || 0),
      SUBSCRIBE: crossWorkspaceCounts.SUBSCRIBE || 0, // SUBSCRIBE is cross-workspace only
    };
  }, [unreadCountByWorkspace, currentWorkspace]);
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
    pagination: null,
    currentWorkspaceId: null,
  });
};

// ============================================
// API Request Hooks
// ============================================

/**
 * Fetch notifications with infinite scroll support
 * When workspaceId is provided, returns both workspace-specific and cross-workspace notifications
 */
export const useFetchNotifications = (category?: NotificationCategory, workspaceId?: string) => {
  const storeNotifications = useNotificationStore((state) => state.notifications);
  const storePagination = useNotificationStore((state) => state.pagination);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<any>(null);

  // Calculate if there are more pages
  const hasNextPage = useMemo(() => {
    if (!storePagination) return true;
    return storePagination.page < storePagination.pageCount;
  }, [storePagination]);

  // Load more function
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasNextPage) return;

    setLoadingMore(true);
    setError(null);

    try {
      const currentPage = storePagination ? storePagination.page + 1 : 1;

      const response = await notificationApi.list({
        category,
        workspaceId,
        page: currentPage,
        limit: 10,
      });

      // Accumulate notifications in store
      addNotifications(response.data);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
      setError(error);
      toast.error("Failed to fetch notifications", {
        description: error.message,
      });
    } finally {
      setLoadingMore(false);
    }
  }, [storePagination, hasNextPage, loadingMore, category, workspaceId]);

  // Initial load
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await notificationApi.list({
        category,
        workspaceId,
        page: 1,
        limit: 10,
      });

      // Replace notifications in store
      setNotifications(response.data);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
      setError(error);
      toast.error("Failed to fetch notifications", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [category, workspaceId]);

  // Reload function
  const reload = useCallback(() => {
    loadInitial();
  }, [loadInitial]);

  // Load initial data when dependencies change
  useMemo(() => {
    loadInitial();
  }, [category, workspaceId]);

  return {
    notifications: storeNotifications,
    pagination: storePagination,
    loading,
    loadingMore,
    noMore: !hasNextPage,
    loadMore,
    reload,
    error,
  };
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
        const response = await notificationApi.batchMarkViewed({
          notificationIds,
        });

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
    async (params: {
      notificationId: string;
      action: "approve" | "reject" | "accept" | "decline";
      reason?: string;
    }) => {
      try {
        const { notificationId, action, reason } = params;
        const response = await notificationApi.resolveAction(notificationId, {
          notificationId,
          action,
          reason,
        });

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

/**
 * Mark all notifications as read with optional category and workspace filtering
 */
export const useMarkAllAsRead = () => {
  return useRequest(
    async (params?: {
      category?: NotificationCategory;
      workspaceId?: string;
    }) => {
      try {
        const response = await notificationApi.markAllAsRead({
          category: params?.category,
          workspaceId: params?.workspaceId,
        });

        // Mark all matching notifications as read in local store
        const now = new Date();
        useNotificationStore.setState((state) => ({
          notifications: state.notifications.map((n) => {
            // Apply same filters as backend
            let matches = !n.viewedAt; // Only unread notifications

            if (params?.category) {
              // Category filter would need event type mapping
              // For now, just mark all unread in the current view
              matches = matches && true;
            }

            return matches ? { ...n, viewedAt: now } : n;
          }),
        }));

        // Refetch workspace-grouped unread count
        const countResponse = await notificationApi.getUnreadCountByWorkspace();
        setUnreadCountByWorkspace(countResponse);

        return response;
      } catch (error: any) {
        console.error("Failed to mark all as read:", error);
        toast.error("Failed to mark all as read", {
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

// ============================================
// Notification Settings Hooks
// ============================================

/**
 * Fetch user's notification settings
 */
export const useFetchNotificationSettings = () => {
  return useRequest(
    async () => {
      try {
        const response = await notificationApi.getSettings();
        return response;
      } catch (error: any) {
        console.error("Failed to fetch notification settings:", error);
        toast.error("Failed to load notification settings", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      refreshDeps: [], // Fetch once on mount
      cacheKey: "notification-settings",
    },
  );
};

/**
 * Update category notification setting
 * Note: This hook should be used with a refetch function from useFetchNotificationSettings
 */
export const useUpdateCategorySetting = (refetch?: () => void) => {
  return useRequest(
    async ({ category, enabled }: { category: NotificationCategory; enabled: boolean }) => {
      try {
        const response = await notificationApi.updateCategorySettings(category, { category, enabled });

        // Refetch settings to ensure UI updates
        if (refetch) {
          refetch();
        }

        toast.success(`${category} notifications ${enabled ? "enabled" : "disabled"}`);

        return response;
      } catch (error: any) {
        console.error("Failed to update notification settings:", error);
        toast.error("Failed to update notification settings", {
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
