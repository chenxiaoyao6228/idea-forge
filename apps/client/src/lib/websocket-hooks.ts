import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { StarEntity } from "@/stores/star-store";
import useStarStore from "@/stores/star-store";
import type { Star } from "@idea/contracts";
import { PartialExcept } from "@/types";
import { useSubspaceWebsocketEvents } from "@/hooks/websocket/subspace-events";
import { useDocumentWebsocketEvents } from "@/hooks/websocket/document-events";
import { useWorkspaceWebsocketEvents } from "@/hooks/websocket/workspace-events";
import { useSharedWithMeWebsocketEvents } from "@/hooks/websocket/shared-with-me-events";

// Define SocketEvents enum locally to avoid import issues
enum SocketEvents {
  STAR_CREATE = "stars.create",
  STAR_UPDATE = "stars.update",
  STAR_DELETE = "stars.delete",
}

/**
 * Hook to handle star-related WebSocket events
 * Returns cleanup function for proper event listener removal
 */
export function useStarWebsocketEvents(socket: Socket | null): (() => void) | null {
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!socket) return;

    // ✅ Split each handler apart instead of using handlers object
    const onStarCreate = (event: PartialExcept<Star, "id">) => {
      console.log(`[websocket]: Received event ${SocketEvents.STAR_CREATE}:`, event);
      if (!event.createdAt || !event.updatedAt || !event.userId || !event.docId) return;

      const star: StarEntity = {
        id: event.id,
        docId: event.docId, // Only allow document stars
        index: event.index ?? null,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
        userId: event.userId,
      };

      // Use direct setState with vanilla JS (following our new pattern)
      useStarStore.setState((state) => ({
        stars: [...state.stars, star],
      }));
      console.log("[websocket]: Star created:", star);
    };

    const onStarUpdate = (event: PartialExcept<Star, "id">) => {
      console.log(`[websocket]: Received event ${SocketEvents.STAR_UPDATE}:`, event);
      if (!event.createdAt || !event.updatedAt || !event.userId || !event.docId) return;

      const changes: Partial<StarEntity> = {
        docId: event.docId, // Only allow document stars
        index: event.index ?? null,
        createdAt: new Date(event.createdAt),
        updatedAt: new Date(event.updatedAt),
        userId: event.userId,
      };

      // Use direct setState with vanilla JS (following our new pattern)
      useStarStore.setState((state) => ({
        stars: state.stars.map(
          (
            star, // Vanilla JS map
          ) => (star.id === event.id ? { ...star, ...changes } : star),
        ),
      }));
      console.log("[websocket]: Star updated:", event);
    };

    const onStarDelete = (event: { id: string; userId: string }) => {
      console.log(`[websocket]: Received event ${SocketEvents.STAR_DELETE}:`, event);

      // Use direct setState with vanilla JS (following our new pattern)
      useStarStore.setState((state) => ({
        stars: state.stars.filter((star) => star.id !== event.id),
      }));
      console.log("[websocket]: Star deleted:", event);
    };

    // Register event listeners
    socket.on(SocketEvents.STAR_CREATE, onStarCreate);
    socket.on(SocketEvents.STAR_UPDATE, onStarUpdate);
    socket.on(SocketEvents.STAR_DELETE, onStarDelete);

    // Create cleanup function
    const cleanup = () => {
      socket.off(SocketEvents.STAR_CREATE, onStarCreate);
      socket.off(SocketEvents.STAR_UPDATE, onStarUpdate);
      socket.off(SocketEvents.STAR_DELETE, onStarDelete);
    };

    cleanupRef.current = cleanup;

    // Return cleanup function
    return cleanup;
  }, [socket]);

  // Return cleanup function for external use
  return cleanupRef.current;
}

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
