import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import useDocumentStore, { useHandleDocumentUpdate, useHandleDocumentRemove } from "@/stores/document-store";
import { useSharedWithMeWebsocketHandlers } from "@/stores/share-store";
import useUserStore from "@/stores/user-store";
import useSubSpaceStore from "@/stores/subspace-store";
import { toast } from "sonner";

export function useDocumentWebsocketEvents(socket: Socket | null): (() => void) | null {
  const { handleWebsocketAbilityChange, handleWebsocketDocumentShare } = useSharedWithMeWebsocketHandlers();
  const { run: handleDocumentUpdate } = useHandleDocumentUpdate();
  const handleDocumentRemove = useHandleDocumentRemove();

  useEffect(() => {
    if (!socket) return;

    // ✅ Split each handler apart instead of using handlers object
    const onDocumentUpdate = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.DOCUMENT_UPDATE}:`, message);
      const { name, document, subspaceId } = message;
      if (!document) return;

      // Update document in store using new hook-based approach
      useDocumentStore.setState((state) => ({
        documents: {
          ...state.documents,
          [document.id]: {
            ...state.documents[document.id],
            title: document.title,
            content: document.content,
            updatedAt: new Date(document.updatedAt).toISOString(),
          },
        },
      }));
    };

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

    const onEntities = async (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.ENTITIES}:`, message);
      const { name, documentIds, subspaceIds, fetchIfMissing } = message;

      const subspaceStore = useSubSpaceStore.getState();

      // Handle document updates
      if (documentIds?.length > 0) {
        for (const documentDescriptor of documentIds) {
          const documentId = documentDescriptor.id;
          const localDocument = useDocumentStore.getState().documents[documentId];

          // Skip if document is already up to date
          if (localDocument?.updatedAt === documentDescriptor.updatedAt) {
            continue;
          }

          // Skip if document doesn't exist locally and we don't need to fetch missing documents
          if (!localDocument && !fetchIfMissing) {
            continue;
          }

          // Use handleDocumentUpdate hook instead of store method
          try {
            await handleDocumentUpdate(documentId, documentDescriptor.updatedAt);
          } catch (err: any) {
            console.error(`Failed to handle document update for ${documentId}:`, err);
          }
        }
      }

      // Handle subspace updates
      if (subspaceIds?.length > 0) {
        for (const subspaceDescriptor of subspaceIds) {
          const subspaceId = subspaceDescriptor.id;
          const localSubspace = subspaceStore.subspaces[subspaceId];

          // Skip if subspace is already up to date
          if (localSubspace?.updatedAt === subspaceDescriptor.updatedAt) {
            continue;
          }

          // Skip if subspace doesn't exist locally and we don't need to fetch missing subspaces
          if (!localSubspace && !fetchIfMissing) {
            continue;
          }

          try {
            // Force refresh the subspace's document structure
            // Note: Navigation tree will be updated via WebSocket events
            // await subspaceStore.fetchNavigationTree(subspaceId, {
            //   force: true,
            // });
          } catch (err: any) {
            // Remove from local store if fetch fails (due to permissions or non-existence)
            if (err.status === 404 || err.status === 403) {
              // Remove subspace from store
              useSubSpaceStore.setState((state) => {
                const newSubspaces = { ...state.subspaces };
                delete newSubspaces[subspaceId];
                return { subspaces: newSubspaces };
              });
            }
          }
        }
      }
    };

    // Register listeners
    socket.on(SocketEvents.DOCUMENT_UPDATE, onDocumentUpdate);
    socket.on(SocketEvents.DOCUMENT_ADD_USER, onDocumentAddUser);
    socket.on(SocketEvents.ENTITIES, onEntities);

    // Return cleanup function
    return () => {
      socket.off(SocketEvents.DOCUMENT_UPDATE, onDocumentUpdate);
      socket.off(SocketEvents.DOCUMENT_ADD_USER, onDocumentAddUser);
      socket.off(SocketEvents.ENTITIES, onEntities);
    };
  }, [socket, handleWebsocketAbilityChange, handleWebsocketDocumentShare, handleDocumentUpdate, handleDocumentRemove]);

  return null;
}
