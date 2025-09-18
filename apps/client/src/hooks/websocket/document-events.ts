import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import useDocumentStore from "@/stores/document";
import useSharedWithMeStore from "@/stores/shared-with-me";
import useUserStore from "@/stores/user";
import useSubSpaceStore from "@/stores/subspace";
import { toast } from "sonner";

export function useDocumentWebsocketEvents(socket: Socket | null): (() => void) | null {
  useEffect(() => {
    if (!socket) return;

    // ✅ Split each handler apart instead of using handlers object
    const onDocumentUpdate = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.DOCUMENT_UPDATE}:`, message);
      const { name, document, subspaceId } = message;
      if (!document) return;

      const documentStore = useDocumentStore.getState();

      // Update document in store using existing store methods
      documentStore.updateOne({
        id: document.id,
        changes: {
          title: document.title,
          content: document.content,
          updatedAt: new Date(document.updatedAt),
        },
      });
    };

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

    const onEntities = async (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.ENTITIES}:`, message);
      const { name, documentIds, subspaceIds, fetchIfMissing } = message;

      const documentStore = useDocumentStore.getState();
      const subspaceStore = useSubSpaceStore.getState();

      // Handle document updates
      if (documentIds?.length > 0) {
        for (const documentDescriptor of documentIds) {
          const documentId = documentDescriptor.id;
          const localDocument = documentStore.entities[documentId];

          // Skip if document is already up to date
          if (localDocument?.updatedAt === documentDescriptor.updatedAt) {
            continue;
          }

          // Skip if document doesn't exist locally and we don't need to fetch missing documents
          if (!localDocument && !fetchIfMissing) {
            continue;
          }

          // Use handleDocumentUpdate instead of fetchDetail directly
          try {
            await documentStore.handleDocumentUpdate(documentId, documentDescriptor.updatedAt);
          } catch (err: any) {
            console.error(`Failed to handle document update for ${documentId}:`, err);
          }
        }
      }

      // Handle subspace updates
      if (subspaceIds?.length > 0) {
        for (const subspaceDescriptor of subspaceIds) {
          const subspaceId = subspaceDescriptor.id;
          const localSubspace = subspaceStore.entities[subspaceId];

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
            await subspaceStore.fetchNavigationTree(subspaceId, {
              force: true,
            });
          } catch (err: any) {
            // Remove from local store if fetch fails (due to permissions or non-existence)
            if (err.status === 404 || err.status === 403) {
              subspaceStore.removeOne(subspaceId);
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
  }, [socket]);

  return null;
}
