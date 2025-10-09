import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import useDocumentStore from "@/stores/document-store";
import useDocumentSharesStore from "@/stores/document-shares-store";
import useGuestCollaboratorsStore from "@/stores/guest-collaborators-store";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { WebSocketEventBuffer } from "./event-buffer";

export function usePermissionWebsocketEvents(socket: Socket | null) {
  const { t } = useTranslation();
  const eventBuffer = useRef(new WebSocketEventBuffer());

  useEffect(() => {
    if (!socket) return;

    // Handle permission override created
    const onPermissionOverrideCreated = (message: any) => {
      console.log("[websocket]: Received PERMISSION_OVERRIDE_CREATED:", message);
      const { userId, docId, document, permission, parentDocTitle, parentDocId } = message;

      // Update document permission in store
      useDocumentStore.setState((state) => ({
        documents: {
          ...state.documents,
          [docId]: {
            ...state.documents[docId],
            ...document,
            effectivePermission: permission,
            permissionSource: "direct",
          },
        },
      }));

      // Update sharing tab if this document's shares are loaded
      useDocumentSharesStore.setState((state) => {
        const shares = state.shares[docId];
        if (!shares) return state;

        // Update the user's share to show override badge
        const updated = shares.map((share) => {
          if (share.type === "user" && share.id === userId) {
            return {
              ...share,
              hasParentPermission: true, // Mark as override
              permission: { level: permission },
              permissionSource: {
                source: "direct",
                sourceDocId: docId,
                sourceDocTitle: document.title,
                level: permission,
              },
              parentPermissionSource: {
                source: "inherited",
                sourceDocId: parentDocId,
                sourceDocTitle: parentDocTitle,
              },
            };
          }
          return share;
        });

        return { shares: { ...state.shares, [docId]: updated } };
      });

      // Show toast notification
      toast.info(
        t("Permission overridden on {{title}} (was inherited from {{parent}})", {
          title: document.title,
          parent: parentDocTitle,
        }),
      );
    };

    // Handle permission override removed (restore inherited)
    const onPermissionOverrideRemoved = (message: any) => {
      console.log("[websocket]: Received PERMISSION_OVERRIDE_REMOVED:", message);
      const { userId, docId, document, restoredPermission, parentDocTitle, parentDocId } = message;

      // Update document permission to inherited
      useDocumentStore.setState((state) => ({
        documents: {
          ...state.documents,
          [docId]: {
            ...state.documents[docId],
            ...document,
            effectivePermission: restoredPermission,
            permissionSource: "inherited",
          },
        },
      }));

      // Update sharing tab to remove override badge
      useDocumentSharesStore.setState((state) => {
        const shares = state.shares[docId];
        if (!shares) return state;

        const updated = shares.map((share) => {
          if (share.type === "user" && share.id === userId) {
            return {
              ...share,
              hasParentPermission: false, // No longer an override
              permission: { level: restoredPermission },
              permissionSource: {
                source: "inherited",
                sourceDocId: parentDocId,
                sourceDocTitle: parentDocTitle,
                level: restoredPermission,
              },
              parentPermissionSource: undefined,
            };
          }
          return share;
        });

        return { shares: { ...state.shares, [docId]: updated } };
      });

      toast.info(
        t("Permission restored to inherited from {{parent}}", {
          parent: parentDocTitle,
        }),
      );
    };

    // Handle group permission changed
    const onGroupPermissionChanged = (message: any) => {
      console.log("[websocket]: Received GROUP_PERMISSION_CHANGED:", message);
      const { userId, groupId, docId, document, permission, includesChildren } = message;

      // Update document permission
      useDocumentStore.setState((state) => ({
        documents: {
          ...state.documents,
          [docId]: {
            ...state.documents[docId],
            ...document,
            effectivePermission: permission,
            permissionSource: "group",
          },
        },
      }));

      // Update sharing tab - update group permission
      useDocumentSharesStore.setState((state) => {
        const shares = state.shares[docId];
        if (!shares) return state;

        const updated = shares.map((share) => {
          if (share.type === "group" && share.id === groupId) {
            return {
              ...share,
              permission: { level: permission },
            };
          }
          return share;
        });

        return { shares: { ...state.shares, [docId]: updated } };
      });

      // Show notification for group permission changes
      if (includesChildren) {
        toast.info(t("Group permissions updated, including child documents"));
      }
    };

    // Handle guest permission updated
    const onGuestPermissionUpdated = (message: any) => {
      console.log("[websocket]: Received GUEST_PERMISSION_UPDATED:", message);
      const { guestId, docId, document, permission, isOverride } = message;

      // Update document in store
      useDocumentStore.setState((state) => ({
        documents: {
          ...state.documents,
          [docId]: {
            ...state.documents[docId],
            ...document,
            effectivePermission: permission,
          },
        },
      }));

      // Update guest sharing tab - update guest permission
      useGuestCollaboratorsStore.setState((state) => {
        const updated = state.guests.map((guest) => {
          if (guest.id === guestId) {
            return {
              ...guest,
              permission,
              hasParentPermission: isOverride,
            };
          }
          return guest;
        });

        return { guests: updated };
      });
    };

    // Handle guest permission inherited (after acceptance, with batching)
    const onGuestPermissionInherited = (message: any) => {
      const { batchSequence, batchIndex, totalBatches, ...event } = message;

      // Use event buffer for ordering
      eventBuffer.current.processEvent(batchSequence, event, (orderedEvent) => {
        console.log(
          `[websocket]: Applying GUEST_PERMISSION_INHERITED batch ${batchIndex + 1}/${totalBatches}, sequence ${batchSequence}`,
        );

        const { newlyAccessibleDocIds } = orderedEvent;

        // Show toast only for the last batch
        if (batchIndex === totalBatches - 1 && newlyAccessibleDocIds?.length > 0) {
          const count = newlyAccessibleDocIds.length;
          toast.success(t("You can now access {{count}} child documents through inheritance", { count }));
        }
      });
    };

    // Handle permission inheritance changed (with batching and ordering)
    const onPermissionInheritanceChanged = (message: any) => {
      const { batchSequence, batchIndex, totalBatches, ...event } = message;

      // Use event buffer to ensure correct ordering
      eventBuffer.current.processEvent(batchSequence, event, (orderedEvent) => {
        console.log(
          `[websocket]: Applying PERMISSION_INHERITANCE_CHANGED batch ${batchIndex + 1}/${totalBatches}, sequence ${batchSequence}`,
        );

        const { affectedDocuments, changeType } = orderedEvent;

        // Update each affected document
        affectedDocuments?.forEach(({ docId, newPermission }: { docId: string; newPermission: string | null }) => {
          useDocumentStore.setState((state) => {
            const doc = state.documents[docId];
            if (!doc) return state;

            return {
              documents: {
                ...state.documents,
                [docId]: {
                  ...doc,
                  effectivePermission: newPermission,
                  permissionSource: "inherited",
                },
              },
            };
          });
        });

        // Show notification only for the last batch
        if (batchIndex === totalBatches - 1) {
          const count = affectedDocuments?.length || 0;
          if (changeType === "removed") {
            toast.warning(t("You lost access to {{count}} documents due to permission change", { count }));
          } else if (changeType === "added") {
            toast.success(t("You gained access to {{count}} new documents", { count }));
          }
        }
      });
    };

    // Handle document shared - update sharing tab when permission is updated
    const onDocumentShared = (message: any) => {
      console.log("[websocket]: permission-events handling DOCUMENT_SHARED for sharing tab update:", message);
      const { docId, sharedUserId, permission } = message;

      if (!docId || !sharedUserId) return;

      // Update sharing tab - update user's permission
      useDocumentSharesStore.setState((state) => {
        const shares = state.shares[docId];
        if (!shares) return state;

        const updated = shares.map((share) => {
          if (share.type === "user" && share.id === sharedUserId) {
            return {
              ...share,
              permission: { level: permission },
            };
          }
          return share;
        });

        return { shares: { ...state.shares, [docId]: updated } };
      });
    };

    // Register listeners
    socket.on(SocketEvents.PERMISSION_OVERRIDE_CREATED, onPermissionOverrideCreated);
    socket.on(SocketEvents.PERMISSION_OVERRIDE_REMOVED, onPermissionOverrideRemoved);
    socket.on(SocketEvents.GROUP_PERMISSION_CHANGED, onGroupPermissionChanged);
    socket.on(SocketEvents.GUEST_PERMISSION_UPDATED, onGuestPermissionUpdated);
    socket.on(SocketEvents.GUEST_PERMISSION_INHERITED, onGuestPermissionInherited);
    socket.on(SocketEvents.PERMISSION_INHERITANCE_CHANGED, onPermissionInheritanceChanged);
    socket.on(SocketEvents.DOCUMENT_SHARED, onDocumentShared);

    // Cleanup
    return () => {
      socket.off(SocketEvents.PERMISSION_OVERRIDE_CREATED, onPermissionOverrideCreated);
      socket.off(SocketEvents.PERMISSION_OVERRIDE_REMOVED, onPermissionOverrideRemoved);
      socket.off(SocketEvents.GROUP_PERMISSION_CHANGED, onGroupPermissionChanged);
      socket.off(SocketEvents.GUEST_PERMISSION_UPDATED, onGuestPermissionUpdated);
      socket.off(SocketEvents.GUEST_PERMISSION_INHERITED, onGuestPermissionInherited);
      socket.off(SocketEvents.PERMISSION_INHERITANCE_CHANGED, onPermissionInheritanceChanged);
      socket.off(SocketEvents.DOCUMENT_SHARED, onDocumentShared);

      // Clear event buffer on cleanup
      eventBuffer.current.clear();
    };
  }, [socket, t]);
}
