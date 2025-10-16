import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Bell } from "lucide-react";
import type { NotificationEntity } from "@/stores/notification-store";
import { NotificationItem } from "./notification-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ViewportBatchProvider } from "./viewport-batch-context";

interface NotificationListProps {
  notifications: NotificationEntity[];
  loading?: boolean;
  loadingMore?: boolean;
  noMore?: boolean;
  onLoadMore?: () => void;
  onMarkAsRead?: (id: string) => void;
  onResolveAction?: (id: string, action: "approve" | "reject" | "accept" | "decline", reason?: string) => void;
  className?: string;
}

export function NotificationList({
  notifications,
  loading = false,
  loadingMore = false,
  noMore = false,
  onLoadMore,
  onMarkAsRead,
  onResolveAction,
  className,
}: NotificationListProps) {
  const { ref: inViewRef, inView } = useInView({
    threshold: 0,
  });

  // Load more when scrolled to bottom
  useEffect(() => {
    if (inView && !noMore && !loadingMore && onLoadMore) {
      onLoadMore();
    }
  }, [inView, noMore, loadingMore, onLoadMore]);

  if (notifications.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="text-muted-foreground mb-2">
          <Bell size={48} className="mx-auto mb-4" />
          <p className="text-sm font-medium">No notifications</p>
          <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
        </div>
      </div>
    );
  }

  return (
    <ViewportBatchProvider batchInterval={1000}>
      <ScrollArea className={cn("h-full", className)}>
        <div className="space-y-2 p-4">
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} onMarkAsRead={onMarkAsRead} onResolveAction={onResolveAction} />
          ))}

          {/* Load more trigger */}
          {!noMore && (
            <div ref={inViewRef} className="flex justify-center py-4">
              {loadingMore && <Spinner className="h-6 w-6" />}
            </div>
          )}
        </div>

        {/* Loading state for initial load */}
        {loading && notifications.length === 0 && (
          <div className="flex justify-center items-center h-32">
            <Spinner className="h-8 w-8" />
          </div>
        )}
      </ScrollArea>
    </ViewportBatchProvider>
  );
}
