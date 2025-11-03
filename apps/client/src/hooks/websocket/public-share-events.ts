import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";
import { SocketEvents } from "@/lib/websocket";
import { usePublicShareStore } from "@/stores/public-share-store";
import type { PublicShareResponse } from "@idea/contracts";

/**
 * WebSocket event handlers for public share events
 *
 * Handles real-time notifications for:
 * - Public share creation (update store with new share)
 * - Public share updates (update store with changed settings)
 * - Public share revocation (remove from store)
 */
export function usePublicShareEventHandlers(socket: Socket | null) {
  useEffect(() => {
    if (!socket) return;

    const handlePublicShareCreated = (data: { publicShare: PublicShareResponse; docId: string; createdByUserId: string }) => {
      console.log("[WebSocket] Public share created:", data);

      // Update store with the new share
      usePublicShareStore.setState((state) => ({
        sharesByDocId: {
          ...state.sharesByDocId,
          [data.docId]: data.publicShare,
        },
      }));

      // Show toast notification
      toast.success("Public link created", {
        description: "Document is now publicly accessible",
        duration: 3000,
      });
    };

    const handlePublicShareUpdated = (data: { publicShare: PublicShareResponse; docId: string; updatedByUserId: string }) => {
      console.log("[WebSocket] Public share updated:", data);

      // Update store with the updated share
      usePublicShareStore.setState((state) => ({
        sharesByDocId: {
          ...state.sharesByDocId,
          [data.docId]: data.publicShare,
        },
      }));

      // Show toast notification
      toast.info("Public link settings updated", {
        duration: 3000,
      });
    };

    const handlePublicShareRevoked = (data: { docId: string; revokedByUserId: string }) => {
      console.log("[WebSocket] Public share revoked:", data);

      // Remove from store
      usePublicShareStore.setState((state) => {
        const newSharesByDocId = { ...state.sharesByDocId };
        delete newSharesByDocId[data.docId];
        return { sharesByDocId: newSharesByDocId };
      });

      // Show toast notification
      toast.warning("Public link revoked", {
        description: "Document is no longer publicly accessible",
        duration: 3000,
      });
    };

    // Register event handlers
    socket.on(SocketEvents.PUBLIC_SHARE_CREATED, handlePublicShareCreated);
    socket.on(SocketEvents.PUBLIC_SHARE_UPDATED, handlePublicShareUpdated);
    socket.on(SocketEvents.PUBLIC_SHARE_REVOKED, handlePublicShareRevoked);

    // Cleanup function
    return () => {
      socket.off(SocketEvents.PUBLIC_SHARE_CREATED, handlePublicShareCreated);
      socket.off(SocketEvents.PUBLIC_SHARE_UPDATED, handlePublicShareUpdated);
      socket.off(SocketEvents.PUBLIC_SHARE_REVOKED, handlePublicShareRevoked);
    };
  }, [socket]);
}
