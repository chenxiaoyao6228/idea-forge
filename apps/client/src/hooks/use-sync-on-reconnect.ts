import { useEffect } from "react";
import { getWebsocketService } from "../lib/websocket";

/**
 * Hook to automatically refetch data when WebSocket reconnects or page becomes visible
 *
 * This hook subscribes to WebSocket recovery events and triggers a refetch callback. This ensures components stay in
 * sync after:
 * - Page becomes visible after being hidden
 * - Network comes back online
 * - WebSocket reconnects after disconnection
 *
 * @param refetch - Callback function to refetch data (e.g., from React Query)
 * @param enabled - Whether the hook is enabled (default: true)
 *
 * @example
 * ```tsx
 * const { refetch } = useWorkspaces();
 * useSyncOnReconnect(refetch);
 * ```
 *
 * @example With conditional enabling
 * ```tsx
 * const { refetch } = useDocument(docId);
 * useSyncOnReconnect(refetch, !!docId); // Only when docId exists
 * ```
 */
export function useSyncOnReconnect(refetch: () => void | Promise<void>, enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const websocket = getWebsocketService();

    // Subscribe to recovery events
    const unsubscribe = websocket.subscribeToRecovery(() => {
      console.log("[useSyncOnReconnect]: Recovery triggered, refetching data");

      try {
        const result = refetch();

        // Handle both sync and async refetch functions
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error("[useSyncOnReconnect]: Error refetching data:", error);
          });
        }
      } catch (error) {
        console.error("[useSyncOnReconnect]: Error refetching data:", error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refetch, enabled]);
}

/**
 * Hook to automatically refetch multiple queries on reconnect
 *
 * Useful when a component needs to refetch multiple pieces of data
 *
 * @param refetchCallbacks - Array of refetch callbacks
 * @param enabled - Whether the hook is enabled (default: true)
 *
 * @example
 * ```tsx
 * const { refetch: refetchWorkspaces } = useWorkspaces();
 * const { refetch: refetchSubspaces } = useSubspaces(workspaceId);
 *
 * useSyncOnReconnectMultiple([refetchWorkspaces, refetchSubspaces]);
 * ```
 */
export function useSyncOnReconnectMultiple(refetchCallbacks: Array<() => void | Promise<void>>, enabled = true): void {
  useEffect(() => {
    if (!enabled || refetchCallbacks.length === 0) {
      return;
    }

    const websocket = getWebsocketService();

    // Subscribe to recovery events
    const unsubscribe = websocket.subscribeToRecovery(() => {
      console.log(`[useSyncOnReconnectMultiple]: Recovery triggered, refetching ${refetchCallbacks.length} queries`);

      // Execute all refetch callbacks
      refetchCallbacks.forEach((refetch, index) => {
        try {
          const result = refetch();

          // Handle both sync and async refetch functions
          if (result instanceof Promise) {
            result.catch((error) => {
              console.error(`[useSyncOnReconnectMultiple]: Error refetching query ${index}:`, error);
            });
          }
        } catch (error) {
          console.error(`[useSyncOnReconnectMultiple]: Error refetching query ${index}:`, error);
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [refetchCallbacks, enabled]);
}
