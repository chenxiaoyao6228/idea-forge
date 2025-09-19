import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import { useSharedWithMeWebsocketHandlers } from "@/stores/share-store";
import useUserStore from "@/stores/user";

export function useSharedWithMeWebsocketEvents(socket: Socket | null): (() => void) | null {
  const cleanupRef = useRef<(() => void) | null>(null);
  const { handleWebsocketAbilityChange, handleWebsocketDocumentShare, handleWebsocketReconnect } = useSharedWithMeWebsocketHandlers();

  useEffect(() => {
    if (!socket) return;

    // ✅ Split each handler apart instead of using handlers object
    const onDocumentAddUser = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.DOCUMENT_ADD_USER}:`, message);
      const { userId, documentId, document, abilities, includeChildDocuments } = message;
      if (!documentId || !document) return;

      const userInfo = useUserStore.getState().userInfo;

      // If the current user was added to the document
      if (userId === userInfo?.id) {
        // Update abilities and shared documents using new hook-based handlers
        handleWebsocketAbilityChange(abilities);
        handleWebsocketDocumentShare(document);
      }
    };

    const onReconnect = () => {
      console.log(`[websocket]: Handling reconnect for shared-with-me`);
      // Refetch shared documents when websocket reconnects
      // (user might have gained new abilities while offline)
      handleWebsocketReconnect();
    };

    // Register listeners
    socket.on(SocketEvents.DOCUMENT_ADD_USER, onDocumentAddUser);
    socket.on("connect", onReconnect);

    // Create cleanup function
    const cleanup = () => {
      socket.off(SocketEvents.DOCUMENT_ADD_USER, onDocumentAddUser);
      socket.off("connect", onReconnect);
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, [socket, handleWebsocketAbilityChange, handleWebsocketDocumentShare, handleWebsocketReconnect]);

  return cleanupRef.current;
}
