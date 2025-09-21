import { useEffect, useRef, useCallback } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import { useHandlePermissionUpdate, useInvalidatePermissions } from "@/stores/permission-store";
import { useUpdateAbility } from "@/stores/ability-store";
import { PermissionLevel } from "@idea/contracts";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import useUserStore from "@/stores/user-store";
import { useTranslation } from "react-i18next";

// Extended socket events for permissions
export const PermissionSocketEvents = {
  ...SocketEvents,
  // Permission-specific events
  PERMISSION_CHANGED: "permission.changed",
  ACCESS_REVOKED: "permission.access_revoked",
  DOCUMENT_SHARED: "permission.document_shared",
  SUBSPACE_PERMISSION_UPDATED: "permission.subspace_updated",
  PERMISSION_INHERITANCE_CHANGED: "permission.inheritance_changed",
} as const;

// Permission update event interfaces
export interface PermissionUpdateEvent {
  type: "PERMISSION_CHANGED" | "ACCESS_REVOKED" | "DOCUMENT_SHARED" | "SUBSPACE_PERMISSION_UPDATED" | "PERMISSION_INHERITANCE_CHANGED";
  resourceId: string;
  resourceType: "DOCUMENT" | "SUBSPACE" | "WORKSPACE";
  userId: string;
  actorId?: string;
  newPermission?: PermissionLevel;
  oldPermission?: PermissionLevel;
  abilities?: Record<string, boolean>;
  affectedDocuments?: string[];
  message?: string;
  timestamp: string;
}

export interface AccessRevokedEvent extends PermissionUpdateEvent {
  type: "ACCESS_REVOKED";
  reason: "PERMISSION_REMOVED" | "USER_REMOVED" | "SUBSPACE_REMOVED" | "WORKSPACE_REMOVED";
  redirectTo?: string;
  gracePeriodSeconds?: number;
}

export interface DocumentSharedEvent extends PermissionUpdateEvent {
  type: "DOCUMENT_SHARED";
  sharedBy: {
    id: string;
    name: string;
    email?: string;
  };
  shareLevel: PermissionLevel;
  documentTitle?: string;
}

export interface SubspacePermissionUpdateEvent extends PermissionUpdateEvent {
  type: "SUBSPACE_PERMISSION_UPDATED";
  subspaceId: string;
  subspaceName?: string;
  changes: {
    subspaceAdminPermission?: PermissionLevel;
    subspaceMemberPermission?: PermissionLevel;
    nonSubspaceMemberPermission?: PermissionLevel;
  };
}

/**
 * Main permission WebSocket hook that handles all permission-related real-time updates
 */
export function usePermissionWebsocketEvents(socket: Socket | null): (() => void) | null {
  const cleanupRef = useRef<(() => void) | null>(null);
  const { run: handlePermissionUpdate } = useHandlePermissionUpdate();
  const { run: invalidatePermissions } = useInvalidatePermissions();
  const { run: updateAbility } = useUpdateAbility();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userInfo = useUserStore((state) => state.userInfo);

  // Handle permission changed event
  const handlePermissionChanged = useCallback(
    async (event: PermissionUpdateEvent) => {
      console.log(`[websocket]: Permission changed for ${event.resourceType} ${event.resourceId}:`, event);

      try {
        // Update permission cache
        await handlePermissionUpdate({
          type: event.type as "PERMISSION_CHANGED" | "ACCESS_REVOKED" | "DOCUMENT_SHARED" | "SUBSPACE_PERMISSION_UPDATED",
          resourceId: event.resourceId,
          resourceType: event.resourceType,
          userId: event.userId,
          newPermission: event.newPermission,
          affectedDocuments: event.affectedDocuments,
        });

        // Update abilities if provided
        if (event.abilities) {
          await updateAbility({
            id: event.resourceId,
            abilities: event.abilities,
          });
        }

        // Show notification if this affects the current user
        if (event.userId === userInfo?.id && event.newPermission) {
          toast.success(t("Permission updated"), {
            description: t("Your permission for this resource has been updated to {{level}}", {
              level: event.newPermission,
            }),
          });
        }
      } catch (error) {
        console.error("Failed to handle permission change:", error);
      }
    },
    [handlePermissionUpdate, updateAbility, userInfo?.id, t],
  );

  // Handle access revoked event
  const handleAccessRevoked = useCallback(
    async (event: AccessRevokedEvent) => {
      console.log(`[websocket]: Access revoked for ${event.resourceType} ${event.resourceId}:`, event);

      try {
        // Invalidate permissions
        if (event.resourceType === "DOCUMENT") {
          await invalidatePermissions([event.resourceId]);
        } else if (event.affectedDocuments) {
          await invalidatePermissions(event.affectedDocuments);
        }

        // Update abilities to remove access
        await updateAbility({
          id: event.resourceId,
          abilities: {
            read: false,
            update: false,
            delete: false,
            share: false,
            comment: false,
          },
        });

        // Show notification and handle navigation
        if (event.userId === userInfo?.id) {
          const reasonMessages = {
            PERMISSION_REMOVED: t("Your access to this resource has been revoked"),
            USER_REMOVED: t("You have been removed from this resource"),
            SUBSPACE_REMOVED: t("The subspace containing this resource has been removed"),
            WORKSPACE_REMOVED: t("The workspace containing this resource has been removed"),
          };

          toast.warning(t("Access Revoked"), {
            description: reasonMessages[event.reason] || event.message,
            duration: 10000, // Longer duration for important notification
          });

          // Handle graceful redirect if on the affected resource
          if (event.redirectTo && window.location.pathname.includes(event.resourceId)) {
            if (event.gracePeriodSeconds && event.gracePeriodSeconds > 0) {
              // Give user time to save work
              setTimeout(() => {
                navigate(event.redirectTo!);
              }, event.gracePeriodSeconds * 1000);

              toast.info(t("Redirecting in {{seconds}} seconds", { seconds: event.gracePeriodSeconds }), {
                description: t("Please save any unsaved work"),
              });
            } else {
              navigate(event.redirectTo);
            }
          }
        }
      } catch (error) {
        console.error("Failed to handle access revocation:", error);
      }
    },
    [invalidatePermissions, updateAbility, userInfo?.id, t, navigate],
  );

  // Handle document shared event
  const handleDocumentShared = useCallback(
    async (event: DocumentSharedEvent) => {
      console.log(`[websocket]: Document shared:`, event);

      try {
        // Update permission cache
        await handlePermissionUpdate({
          type: "DOCUMENT_SHARED",
          resourceId: event.resourceId,
          resourceType: "DOCUMENT",
          userId: event.userId,
          newPermission: event.shareLevel,
        });

        // Update abilities if provided
        if (event.abilities) {
          await updateAbility({
            id: event.resourceId,
            abilities: event.abilities,
          });
        }

        // Show notification if this affects the current user
        if (event.userId === userInfo?.id) {
          toast.success(t("Document shared with you"), {
            description: t('{{sharedBy}} shared "{{title}}" with {{level}} access', {
              sharedBy: event.sharedBy.name,
              title: event.documentTitle || "a document",
              level: event.shareLevel,
            }),
            action: {
              label: t("View"),
              onClick: () => navigate(`/doc/${event.resourceId}`),
            },
          });
        }
      } catch (error) {
        console.error("Failed to handle document share:", error);
      }
    },
    [handlePermissionUpdate, updateAbility, userInfo?.id, t, navigate],
  );

  // Handle subspace permission update event
  const handleSubspacePermissionUpdate = useCallback(
    async (event: SubspacePermissionUpdateEvent) => {
      console.log(`[websocket]: Subspace permission updated:`, event);

      try {
        // Invalidate all affected documents
        if (event.affectedDocuments && event.affectedDocuments.length > 0) {
          await invalidatePermissions(event.affectedDocuments);
        }

        // Show notification if this affects the current user
        if (event.userId === userInfo?.id) {
          toast.info(t("Subspace permissions updated"), {
            description: t('Permission settings for "{{subspace}}" have been updated', {
              subspace: event.subspaceName || "a subspace",
            }),
          });
        }
      } catch (error) {
        console.error("Failed to handle subspace permission update:", error);
      }
    },
    [invalidatePermissions, userInfo?.id, t],
  );

  // Main effect to set up event listeners
  useEffect(() => {
    if (!socket) return;

    const listeners = [
      {
        event: PermissionSocketEvents.PERMISSION_CHANGED,
        handler: handlePermissionChanged,
      },
      {
        event: PermissionSocketEvents.ACCESS_REVOKED,
        handler: handleAccessRevoked,
      },
      {
        event: PermissionSocketEvents.DOCUMENT_SHARED,
        handler: handleDocumentShared,
      },
      {
        event: PermissionSocketEvents.SUBSPACE_PERMISSION_UPDATED,
        handler: handleSubspacePermissionUpdate,
      },
    ];

    // Register all event listeners
    listeners.forEach(({ event, handler }) => {
      socket.on(event, handler);
    });

    // Create cleanup function
    const cleanup = () => {
      listeners.forEach(({ event, handler }) => {
        socket.off(event, handler);
      });
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, [socket, handlePermissionChanged, handleAccessRevoked, handleDocumentShared, handleSubspacePermissionUpdate]);

  return cleanupRef.current;
}

/**
 * Hook specifically for document permission updates
 * Focuses only on document-level permission changes
 */
export function useDocumentPermissionWebsocket(socket: Socket | null, documentId?: string) {
  const { run: handlePermissionUpdate } = useHandlePermissionUpdate();
  const { run: updateAbility } = useUpdateAbility();
  const userInfo = useUserStore((state) => state.userInfo);

  useEffect(() => {
    if (!socket || !documentId) return;

    const handleDocumentPermissionChange = async (event: PermissionUpdateEvent) => {
      // Only handle events for the specific document
      if (event.resourceId !== documentId || event.resourceType !== "DOCUMENT") return;

      console.log(`[websocket]: Document ${documentId} permission changed:`, event);

      try {
        await handlePermissionUpdate({
          type: event.type as "PERMISSION_CHANGED" | "ACCESS_REVOKED" | "DOCUMENT_SHARED" | "SUBSPACE_PERMISSION_UPDATED",
          resourceId: event.resourceId,
          resourceType: event.resourceType,
          userId: event.userId,
          newPermission: event.newPermission,
          affectedDocuments: event.affectedDocuments,
        });

        if (event.abilities) {
          await updateAbility({
            id: documentId,
            abilities: event.abilities,
          });
        }
      } catch (error) {
        console.error("Failed to handle document permission change:", error);
      }
    };

    // Listen to relevant events
    socket.on(PermissionSocketEvents.PERMISSION_CHANGED, handleDocumentPermissionChange);
    socket.on(PermissionSocketEvents.DOCUMENT_SHARED, handleDocumentPermissionChange);

    return () => {
      socket.off(PermissionSocketEvents.PERMISSION_CHANGED, handleDocumentPermissionChange);
      socket.off(PermissionSocketEvents.DOCUMENT_SHARED, handleDocumentPermissionChange);
    };
  }, [socket, documentId, handlePermissionUpdate, updateAbility, userInfo?.id]);
}

/**
 * Hook for handling collaboration permission checks during real-time editing
 * Integrates with the collaboration provider to handle permission changes
 */
export function useCollaborationPermissionWebsocket(socket: Socket | null, documentId?: string, onPermissionRevoked?: () => void) {
  const userInfo = useUserStore((state) => state.userInfo);
  const { t } = useTranslation();

  useEffect(() => {
    if (!socket || !documentId) return;

    const handleCollaborationPermissionChange = (event: PermissionUpdateEvent | AccessRevokedEvent) => {
      // Only handle events for the specific document and current user
      if (event.resourceId !== documentId || event.resourceType !== "DOCUMENT" || event.userId !== userInfo?.id) {
        return;
      }

      console.log(`[websocket]: Collaboration permission change for ${documentId}:`, event);

      if (event.type === "ACCESS_REVOKED") {
        // Handle access revocation during collaboration
        toast.warning(t("Edit access revoked"), {
          description: t("Your editing access has been revoked. The document will be saved and closed."),
          duration: 5000,
        });

        // Give user 3 seconds to see the message, then trigger callback
        setTimeout(() => {
          onPermissionRevoked?.();
        }, 3000);
      } else if (event.type === "PERMISSION_CHANGED") {
        // Check if edit permission was removed
        const hasEditPermission = event.abilities?.update || ["EDIT", "ADMIN"].includes(event.newPermission || "NONE");

        if (!hasEditPermission) {
          toast.info(t("Permission changed"), {
            description: t("You no longer have edit access to this document."),
          });

          // Don't force close, but let the collaboration provider handle read-only mode
        }
      }
    };

    // Listen to permission events
    socket.on(PermissionSocketEvents.PERMISSION_CHANGED, handleCollaborationPermissionChange);
    socket.on(PermissionSocketEvents.ACCESS_REVOKED, handleCollaborationPermissionChange);

    return () => {
      socket.off(PermissionSocketEvents.PERMISSION_CHANGED, handleCollaborationPermissionChange);
      socket.off(PermissionSocketEvents.ACCESS_REVOKED, handleCollaborationPermissionChange);
    };
  }, [socket, documentId, userInfo?.id, onPermissionRevoked, t]);
}
