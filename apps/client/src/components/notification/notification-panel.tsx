import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { NotificationList } from "./notification-list";
import useNotificationStore, {
  useFilteredNotifications,
  useFetchNotifications,
  useMarkAsRead,
  useResolveAction,
  useUnreadCountByWorkspace,
} from "@/stores/notification-store";
import { useCurrentWorkspace } from "@/stores/workspace-store";
import type { NotificationCategory } from "@idea/contracts";
import { cn } from "@/lib/utils";

interface NotificationPanelProps {
  className?: string;
  onClose?: () => void;
}

export function NotificationPanel({ className, onClose }: NotificationPanelProps) {
  const [activeTab, setActiveTab] = useState<NotificationCategory>("SHARING");
  const [currentPage, setCurrentPage] = useState(1);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Get workspace context
  const currentWorkspace = useCurrentWorkspace();
  const unreadCountByWorkspace = useUnreadCountByWorkspace();

  // Fetch notifications for current tab (append = true for page > 1)
  // Pass workspaceId to get current workspace + cross-workspace notifications
  const fetchNotifications = useFetchNotifications(activeTab, undefined, currentPage, currentPage > 1, currentWorkspace?.id);
  const markAsRead = useMarkAsRead();
  const resolveAction = useResolveAction();

  // Get filtered notifications and pagination
  const notifications = useFilteredNotifications(activeTab);
  const pagination = useNotificationStore((state) => state.pagination);

  // Get unread counts for each category using workspace-grouped counts
  const currentWorkspaceUnread = useMemo(() => {
    if (!unreadCountByWorkspace || !currentWorkspace) {
      return {
        MENTIONS: 0,
        SHARING: 0,
        INBOX: 0,
        SUBSCRIBE: 0,
      };
    }
    return (
      unreadCountByWorkspace.byWorkspace[currentWorkspace.id] || {
        MENTIONS: 0,
        SHARING: 0,
        INBOX: 0,
        SUBSCRIBE: 0,
      }
    );
  }, [unreadCountByWorkspace, currentWorkspace]);

  // SUBSCRIBE tab shows cross-workspace notifications
  const subscribeUnread = useMemo(() => {
    if (!unreadCountByWorkspace) return 0;
    return unreadCountByWorkspace.crossWorkspace.SUBSCRIBE || 0;
  }, [unreadCountByWorkspace]);

  const mentionsUnread = currentWorkspaceUnread.MENTIONS;
  const sharingUnread = currentWorkspaceUnread.SHARING;

  // INBOX includes both workspace-specific and cross-workspace notifications (workspace invitations)
  const inboxUnread = useMemo(() => {
    if (!unreadCountByWorkspace) return 0;
    const workspaceInbox = currentWorkspaceUnread.INBOX;
    const crossWorkspaceInbox = unreadCountByWorkspace.crossWorkspace.INBOX || 0;
    return workspaceInbox + crossWorkspaceInbox;
  }, [unreadCountByWorkspace, currentWorkspaceUnread]);

  // Initial load and tab changes
  useEffect(() => {
    setCurrentPage(1);
    setIsInitialLoad(true);
    fetchNotifications.run();
  }, [activeTab]);

  // Load more when currentPage changes (only for page > 1)
  useEffect(() => {
    if (!isInitialLoad && currentPage > 1) {
      fetchNotifications.run();
    }
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [currentPage]);

  // Handle load more
  const handleLoadMore = () => {
    if (pagination && currentPage < pagination.pageCount && !fetchNotifications.loading) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Handle mark as read
  const handleMarkAsRead = (id: string) => {
    markAsRead.run(id);
  };

  // Handle resolve action
  const handleResolveAction = (id: string, action: "approve" | "reject" | "accept" | "decline", reason?: string) => {
    resolveAction.run({ notificationId: id, action, reason });
  };

  const hasMore = pagination ? currentPage < pagination.pageCount : false;

  return (
    <div className={cn("flex flex-col bg-background rounded-lg shadow-lg", className)} style={{ width: 500, maxHeight: "calc(100vh - 100px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="text-md font-semibold">Notifications</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <Check className="h-4 w-4 mr-1" />
          Mark all as read
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as NotificationCategory)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start rounded-none border-b px-2">
          <TabsTrigger value="MENTIONS" className="relative">
            Mentions
            {mentionsUnread > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
                {mentionsUnread > 99 ? "99+" : mentionsUnread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="SHARING" className="relative">
            Sharing
            {sharingUnread > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
                {sharingUnread > 99 ? "99+" : sharingUnread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="INBOX" className="relative">
            Inbox
            {inboxUnread > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
                {inboxUnread > 99 ? "99+" : inboxUnread}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="SUBSCRIBE" className="relative">
            Subscribe
            {subscribeUnread > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
                {subscribeUnread > 99 ? "99+" : subscribeUnread}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value="MENTIONS" className="flex-1 m-0 overflow-y-auto custom-scrollbar">
          <NotificationList
            notifications={notifications}
            loading={fetchNotifications.loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onMarkAsRead={handleMarkAsRead}
            onResolveAction={handleResolveAction}
            className="h-full"
          />
        </TabsContent>

        <TabsContent value="SHARING" className="flex-1 m-0 overflow-y-auto custom-scrollbar">
          <NotificationList
            notifications={notifications}
            loading={fetchNotifications.loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onMarkAsRead={handleMarkAsRead}
            onResolveAction={handleResolveAction}
            className="h-full"
          />
        </TabsContent>

        <TabsContent value="INBOX" className="flex-1 m-0 overflow-y-auto custom-scrollbar">
          <NotificationList
            notifications={notifications}
            loading={fetchNotifications.loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onMarkAsRead={handleMarkAsRead}
            onResolveAction={handleResolveAction}
            className="h-full"
          />
        </TabsContent>

        <TabsContent value="SUBSCRIBE" className="flex-1 m-0 overflow-y-auto custom-scrollbar">
          <NotificationList
            notifications={notifications}
            loading={fetchNotifications.loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onMarkAsRead={handleMarkAsRead}
            onResolveAction={handleResolveAction}
            className="h-full"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
