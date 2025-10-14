import { useRef, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import type { NotificationEntity } from "@/stores/notification-store";
import { NotificationItem } from "./notification-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { ViewportBatchProvider } from "./viewport-batch-context";

interface NotificationListProps {
  notifications: NotificationEntity[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onMarkAsRead?: (id: string) => void;
  onResolveAction?: (id: string, action: "approve" | "reject" | "accept" | "decline", reason?: string) => void;
  className?: string;
}

export function NotificationList({
  notifications,
  loading = false,
  hasMore = false,
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
    if (inView && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  }, [inView, hasMore, loading, onLoadMore]);

  if (notifications.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center px-4">
        <div className="text-muted-foreground mb-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
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
          {hasMore && (
            <div ref={inViewRef} className="flex justify-center py-4">
              {loading && <Spinner className="h-6 w-6" />}
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
