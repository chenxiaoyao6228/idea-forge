import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";
import { useBatchMarkViewed } from "@/stores/notification-store";

interface ViewportBatchContextValue {
  /**
   * Register a notification ID to be marked as viewed
   * IDs will be batched and sent together after a debounce interval
   */
  markAsViewed: (notificationId: string) => void;
}

const ViewportBatchContext = createContext<ViewportBatchContextValue | null>(null);

interface ViewportBatchProviderProps {
  children: ReactNode;
  /**
   * Debounce interval in milliseconds (default: 1000ms)
   * Multiple notifications will be batched within this time window
   */
  batchInterval?: number;
}

/**
 * Provider that batches viewport-based read tracking requests
 * Instead of sending individual requests for each notification,
 * collects multiple IDs and sends them in a single batch request
 */
export function ViewportBatchProvider({ children, batchInterval = 1000 }: ViewportBatchProviderProps) {
  const batchMarkViewed = useBatchMarkViewed();
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const markAsViewed = useCallback(
    (notificationId: string) => {
      // Add to pending set
      pendingIdsRef.current.add(notificationId);

      // Clear existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set new timer to send batch
      timerRef.current = setTimeout(() => {
        if (pendingIdsRef.current.size > 0) {
          const idsToSend = Array.from(pendingIdsRef.current);
          pendingIdsRef.current.clear();

          // Send batch request
          batchMarkViewed.run(idsToSend);
        }
      }, batchInterval);
    },
    [batchMarkViewed, batchInterval],
  );

  const value: ViewportBatchContextValue = {
    markAsViewed,
  };

  return <ViewportBatchContext.Provider value={value}>{children}</ViewportBatchContext.Provider>;
}

/**
 * Hook to access the viewport batch manager
 * Must be used within a ViewportBatchProvider
 */
export function useViewportBatch() {
  const context = useContext(ViewportBatchContext);
  if (!context) {
    throw new Error("useViewportBatch must be used within ViewportBatchProvider");
  }
  return context;
}
