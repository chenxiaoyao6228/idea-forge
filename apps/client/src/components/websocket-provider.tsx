import { useEffect } from "react";
import { useWebsocketEventHandlers } from "@/hooks/websocket";
import { getWebsocketService } from "@/lib/websocket";

/**
 * WebSocket Provider Component
 *
 * This component manages WebSocket event handlers using our new hook-based approach.
 * It should be placed at the app level to ensure WebSocket events are handled throughout
 * the application lifecycle.
 *
 * Features:
 * - Automatic cleanup when component unmounts
 * - Integrates with our new store pattern
 * - Handles all WebSocket events (star, subspace, document, workspace, shared-with-me)
 * - Manages WebSocket connection lifecycle
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const websocketService = getWebsocketService();
  const cleanup = useWebsocketEventHandlers(websocketService.socket);

  useEffect(() => {
    // Connect to WebSocket when component mounts
    websocketService.connect().catch((error) => {
      console.error("[websocket-provider]: Connection failed:", error);
    });

    // Cleanup function will be called when component unmounts
    return () => {
      cleanup();
      websocketService.disconnect();
    };
  }, []); // Empty dependency array to run only once

  return <>{children}</>;
}

/**
 * Hook to use WebSocket event handlers in any component
 *
 * This hook can be used in components that need to manage WebSocket events
 * independently of the global provider.
 *
 * @returns cleanup function for manual cleanup if needed
 */
export function useWebSocketEvents() {
  const websocketService = getWebsocketService();
  return useWebsocketEventHandlers(websocketService.socket);
}
