import { useSubspaceWebsocketEvents } from "@/hooks/websocket/subspace-events";
import { useDocumentWebsocketEvents } from "@/hooks/websocket/document-events";
import { useWorkspaceWebsocketEvents } from "@/hooks/websocket/workspace-events";
import { useSharedWithMeWebsocketEvents } from "@/hooks/websocket/shared-with-me-events";
import { useStarWebsocketEvents } from "@/hooks/websocket/star-events";
import { Socket } from "socket.io-client";

/**
 * Hook to manage all WebSocket event handlers
 * This centralizes event registration and cleanup
 */
export function useWebsocketEventHandlers(socket: Socket | null) {
  const starCleanup = useStarWebsocketEvents(socket);
  const subspaceCleanup = useSubspaceWebsocketEvents(socket);
  const documentCleanup = useDocumentWebsocketEvents(socket);
  const workspaceCleanup = useWorkspaceWebsocketEvents(socket);
  const sharedWithMeCleanup = useSharedWithMeWebsocketEvents(socket);

  // Return combined cleanup function
  return () => {
    if (starCleanup) {
      starCleanup();
    }
    if (subspaceCleanup) {
      subspaceCleanup();
    }
    if (documentCleanup) {
      documentCleanup();
    }
    if (workspaceCleanup) {
      workspaceCleanup();
    }
    if (sharedWithMeCleanup) {
      sharedWithMeCleanup();
    }
  };
}
