import { useEffect } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import useDocumentStore, { useHandleDocumentUpdate, useHandleDocumentRemove } from "@/stores/document-store";
import { useSharedWithMeWebsocketHandlers } from "@/stores/share-store";
import useUserStore from "@/stores/user-store";
import useSubSpaceStore, { useRefreshNavigationTree } from "@/stores/subspace-store";
import useSharedWithMeStore from "@/stores/share-store";
import { toast } from "sonner";

export function useDocumentWebsocketEvents(socket: Socket | null): (() => void) | null {
  const { handleWebsocketAbilityChange, handleWebsocketDocumentShare } = useSharedWithMeWebsocketHandlers();
  const { run: handleDocumentUpdate } = useHandleDocumentUpdate();
  const handleDocumentRemove = useHandleDocumentRemove();
  const refreshNavigationTree = useRefreshNavigationTree();

  useEffect(() => {
    if (!socket) return;

    // ✅ Split each handler apart instead of using handlers object
    const onDocumentUpdate = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.DOCUMENT_UPDATE}:`, message);
      const { name, document, subspaceId } = message;
      if (!document) return;

      // Get current state to check if document exists
      const currentState = useDocumentStore.getState();
      const existingDocument = currentState.documents[document.id];

      // Update document in store with all provided fields
      useDocumentStore.setState((state) => {
        // If document doesn't exist in store, add it
        if (!existingDocument) {
          console.log(`[websocket]: Adding new document to store: ${document.id}`);
          return {
            documents: {
              ...state.documents,
              [document.id]: {
                ...document,
                // Ensure updatedAt is properly formatted
                updatedAt: document.updatedAt ? new Date(document.updatedAt).toISOString() : document.updatedAt,
              },
            },
          };
        }

        // Merge the incoming document data with existing document data
        // This ensures all fields are updated while preserving any existing fields not in the update
        const updatedDocument = {
          ...existingDocument,
          ...document,
          // Ensure updatedAt is properly formatted
          updatedAt: document.updatedAt ? new Date(document.updatedAt).toISOString() : existingDocument.updatedAt,
        };

        return {
          documents: {
            ...state.documents,
            [document.id]: updatedDocument,
          },
        };
      });

      // Also update the subspace navigation tree if the document title changed
      if (subspaceId && (existingDocument?.title !== document.title || existingDocument?.updatedAt !== document.updatedAt || !existingDocument)) {
        const subspaceStore = useSubSpaceStore.getState();
        const subspace = subspaceStore.subspaces[subspaceId];

        if (subspace?.navigationTree) {
          const updateNavigationTree = (nodes: any[]): any[] => {
            return nodes.map((node) => {
              if (node.id === document.id) {
                return {
                  ...node,
                  title: document.title,
                  icon: document.icon,
                };
              }
              if (node.children) {
                return {
                  ...node,
                  children: updateNavigationTree(node.children),
                };
              }
              return node;
            });
          };

          useSubSpaceStore.setState((state) => ({
            subspaces: {
              ...state.subspaces,
              [subspaceId]: {
                ...state.subspaces[subspaceId],
                navigationTree: updateNavigationTree(subspace.navigationTree),
              },
            },
          }));
        }
      }
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

    const onDocumentShared = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.DOCUMENT_SHARED}:`, message);
      const { docId, sharedUserId, document, permission, shareType, sharedByUserId } = message;
      if (!docId || !document) return;

      const userInfo = useUserStore.getState().userInfo;

      // If the current user was shared this document
      if (sharedUserId === userInfo?.id) {
        // Update shared documents using the hook-based handler
        handleWebsocketDocumentShare(document);
      }
    };

    const onAccessRevoked = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.ACCESS_REVOKED}:`, message);
      const { docId, revokedUserId, revokedByUserId } = message;
      if (!docId) return;

      const userInfo = useUserStore.getState().userInfo;

      // If the current user's access was revoked
      if (revokedUserId === userInfo?.id) {
        console.log(`[websocket]: Access revoked for current user`, { docId });
        // Remove document from shared documents store
        useSharedWithMeStore.setState((state) => ({
          documents: state.documents.filter((doc) => doc.id !== docId),
          total: Math.max(0, state.total - 1),
        }));
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
            // This will update the navigation tree to show the new document
            await refreshNavigationTree(subspaceId);
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
    socket.on(SocketEvents.DOCUMENT_SHARED, onDocumentShared);
    socket.on(SocketEvents.ACCESS_REVOKED, onAccessRevoked);
    socket.on(SocketEvents.ENTITIES, onEntities);

    // Return cleanup function
    return () => {
      socket.off(SocketEvents.DOCUMENT_UPDATE, onDocumentUpdate);
      socket.off(SocketEvents.DOCUMENT_ADD_USER, onDocumentAddUser);
      socket.off(SocketEvents.DOCUMENT_SHARED, onDocumentShared);
      socket.off(SocketEvents.ACCESS_REVOKED, onAccessRevoked);
      socket.off(SocketEvents.ENTITIES, onEntities);
    };
  }, [socket, handleWebsocketAbilityChange, handleWebsocketDocumentShare, handleDocumentUpdate, handleDocumentRemove, refreshNavigationTree]);

  return null;
}
