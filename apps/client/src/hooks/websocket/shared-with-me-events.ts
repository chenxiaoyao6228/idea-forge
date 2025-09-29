import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import { useSharedWithMeWebsocketHandlers } from "@/stores/share-store";
import useUserStore from "@/stores/user-store";
import useSharedWithMeStore from "@/stores/share-store";

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

    const onDocumentShared = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.DOCUMENT_SHARED}:`, message);
      const { docId, sharedUserId, document, permission, shareType, sharedByUserId } = message;
      if (!docId || !document) {
        console.log(`[websocket]: Missing docId or document in DOCUMENT_SHARED event`, { docId, document });
        return;
      }

      const userInfo = useUserStore.getState().userInfo;

      // If the current user was shared this document
      if (sharedUserId === userInfo?.id) {
        console.log(`[websocket]: Processing document share for current user`, { docId, document });
        // Update shared documents using the hook-based handler
        handleWebsocketDocumentShare(document);
      } else {
        console.log(`[websocket]: Document shared with different user`, { sharedUserId, currentUserId: userInfo?.id });
      }
    };

    const onAccessRevoked = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.ACCESS_REVOKED}:`, message);
      const { docId, revokedUserId, revokedByUserId } = message;
      if (!docId) {
        console.log(`[websocket]: Missing docId in ACCESS_REVOKED event`, { docId });
        return;
      }

      const userInfo = useUserStore.getState().userInfo;

      // If the current user's access was revoked
      if (revokedUserId === userInfo?.id) {
        console.log(`[websocket]: Access revoked for current user`, { docId });
        // Remove document from shared documents store
        useSharedWithMeStore.setState((state) => ({
          documents: state.documents.filter((doc) => doc.id !== docId),
          total: Math.max(0, state.total - 1),
        }));
      } else {
        console.log(`[websocket]: Access revoked for different user`, { revokedUserId, currentUserId: userInfo?.id });
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
    socket.on(SocketEvents.DOCUMENT_SHARED, onDocumentShared);
    socket.on(SocketEvents.ACCESS_REVOKED, onAccessRevoked);
    socket.on("connect", onReconnect);

    // Create cleanup function
    const cleanup = () => {
      socket.off(SocketEvents.DOCUMENT_ADD_USER, onDocumentAddUser);
      socket.off(SocketEvents.DOCUMENT_SHARED, onDocumentShared);
      socket.off(SocketEvents.ACCESS_REVOKED, onAccessRevoked);
      socket.off("connect", onReconnect);
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, [socket, handleWebsocketAbilityChange, handleWebsocketDocumentShare, handleWebsocketReconnect]);

  return cleanupRef.current;
}
