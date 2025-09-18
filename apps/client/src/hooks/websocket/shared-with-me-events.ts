import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import useSharedWithMeStore from "@/stores/shared-with-me";
import useUserStore from "@/stores/user";

export function useSharedWithMeWebsocketEvents(socket: Socket | null): (() => void) | null {
  useEffect(() => {
    if (!socket) return;

    // ✅ Split each handler apart instead of using handlers object
    const onDocumentAddUser = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.DOCUMENT_ADD_USER}:`, message);
      const { userId, documentId, document, abilities, includeChildDocuments } = message;
      if (!documentId || !document) return;

      const sharedWithMeStore = useSharedWithMeStore.getState();
      const userInfo = useUserStore.getState().userInfo;

      // If the current user was added to the document
      if (userId === userInfo?.id) {
        // Update abilities and shared documents using existing store methods
        sharedWithMeStore.handleWebsocketAbilityChange(abilities);
        sharedWithMeStore.handleWebsocketDocumentShare(document);
      }
    };

    const onReconnect = () => {
      console.log(`[websocket]: Handling reconnect for shared-with-me`);
      const sharedWithMeStore = useSharedWithMeStore.getState();

      // Refetch shared documents when websocket reconnects
      // (user might have gained new abilities while offline)
      sharedWithMeStore.handleWebsocketReconnect();
    };

    // Register listeners
    socket.on(SocketEvents.DOCUMENT_ADD_USER, onDocumentAddUser);
    socket.on("connect", onReconnect);

    // Return cleanup function
    return () => {
      socket.off(SocketEvents.DOCUMENT_ADD_USER, onDocumentAddUser);
      socket.off("connect", onReconnect);
    };
  }, [socket]);

  return null;
}
