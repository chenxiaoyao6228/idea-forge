import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@idea/ui/shadcn/ui/tabs";
import { Badge } from "@idea/ui/shadcn/ui/badge";
import { ScrollArea } from "@idea/ui/shadcn/ui/scroll-area";
import { Separator } from "@idea/ui/shadcn/ui/separator";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Bell, Check } from "lucide-react";
import { NotificationList } from "./notification-list";
import { useMarkAsRead, useMarkAllAsRead, useResolveAction, useCurrentWorkspaceUnreadByCategory, useFetchNotifications } from "@/stores/notification-store";
import { useCurrentWorkspace } from "@/stores/workspace-store";
import type { NotificationCategory } from "@idea/contracts";
import { cn } from "@idea/ui/shadcn/utils";
import useInfiniteScroll from "react-infinite-scroll-hook";

interface NotificationPanelProps {
  className?: string;
  onClose?: () => void;
}

export function NotificationPanel({ className, onClose }: NotificationPanelProps) {
  const [activeTab, setActiveTab] = useState<NotificationCategory>("SHARING");

  // Get workspace context
  const currentWorkspace = useCurrentWorkspace();

  // Fetch notifications with infinite scroll (auto-reloads on tab/workspace change)
  const { notifications, pagination, loading, loadingMore, noMore, loadMore, reload, error } = useFetchNotifications(activeTab, currentWorkspace?.id);

  const [infiniteRef] = useInfiniteScroll({
    loading: loadingMore,
    hasNextPage: !noMore,
    onLoadMore: loadMore,
    disabled: Boolean(error),
    rootMargin: "0px 0px 400px 0px",
  });

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const resolveAction = useResolveAction();

  // Get unread counts for current workspace by category
  const unreadByCategory = useCurrentWorkspaceUnreadByCategory();
  const mentionsUnread = unreadByCategory.MENTIONS;
  const sharingUnread = unreadByCategory.SHARING;
  const inboxUnread = unreadByCategory.INBOX;
  const subscribeUnread = unreadByCategory.SUBSCRIBE;

  // Handle mark as read
  const handleMarkAsRead = (id: string) => {
    markAsRead.run(id);
  };

  // Handle resolve action
  const handleResolveAction = (id: string, action: "approve" | "reject" | "accept" | "decline", reason?: string) => {
    resolveAction.run({ notificationId: id, action, reason });
  };

  // Handle mark all as read
  const handleMarkAllAsRead = () => {
    markAllAsRead.run({
      workspaceId: currentWorkspace?.id,
    });
  };

  return (
    <div className={cn("flex flex-col bg-background rounded-lg shadow-lg", className)} style={{ width: 500, maxHeight: "calc(100vh - 200px)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h3 className="text-md font-semibold">Notifications</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} disabled={markAllAsRead.loading}>
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
            loading={loading}
            loadingMore={loadingMore}
            noMore={noMore}
            onLoadMore={loadMore}
            onMarkAsRead={handleMarkAsRead}
            onResolveAction={handleResolveAction}
            infiniteRef={infiniteRef}
            className="h-full"
          />
        </TabsContent>

        <TabsContent value="SHARING" className="flex-1 m-0 overflow-y-auto custom-scrollbar">
          <NotificationList
            notifications={notifications}
            loading={loading}
            loadingMore={loadingMore}
            noMore={noMore}
            onLoadMore={loadMore}
            onMarkAsRead={handleMarkAsRead}
            onResolveAction={handleResolveAction}
            infiniteRef={infiniteRef}
            className="h-full"
          />
        </TabsContent>

        <TabsContent value="INBOX" className="flex-1 m-0 overflow-y-auto custom-scrollbar">
          <NotificationList
            notifications={notifications}
            loading={loading}
            loadingMore={loadingMore}
            noMore={noMore}
            onLoadMore={loadMore}
            onMarkAsRead={handleMarkAsRead}
            onResolveAction={handleResolveAction}
            infiniteRef={infiniteRef}
            className="h-full"
          />
        </TabsContent>

        <TabsContent value="SUBSCRIBE" className="flex-1 m-0 overflow-y-auto custom-scrollbar">
          <NotificationList
            notifications={notifications}
            loading={loading}
            loadingMore={loadingMore}
            noMore={noMore}
            onLoadMore={loadMore}
            onMarkAsRead={handleMarkAsRead}
            onResolveAction={handleResolveAction}
            infiniteRef={infiniteRef}
            className="h-full"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
