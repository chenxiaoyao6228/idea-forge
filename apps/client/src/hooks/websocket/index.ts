import { useSubspaceWebsocketEvents } from "@/hooks/websocket/subspace-events";
import { useDocumentWebsocketEvents } from "@/hooks/websocket/document-events";
import { useWorkspaceWebsocketEvents } from "@/hooks/websocket/workspace-events";
import { useSharedWithMeWebsocketEvents } from "@/hooks/websocket/shared-with-me-events";
import { useStarWebsocketEvents } from "@/hooks/websocket/star-events";
import { useGuestEventHandlers } from "@/hooks/websocket/guest-events";
import { Socket } from "socket.io-client";

/**
 * Hook to manage all WebSocket event handlers
 * This centralizes event registration and cleanup
 */
export function useWebsocketEventHandlers(socket: Socket | null) {
  useStarWebsocketEvents(socket);
  useSubspaceWebsocketEvents(socket);
  useDocumentWebsocketEvents(socket);
  useWorkspaceWebsocketEvents(socket);
  useSharedWithMeWebsocketEvents(socket);
  useGuestEventHandlers(socket); // This hook now manages its own cleanup via useEffect
}
