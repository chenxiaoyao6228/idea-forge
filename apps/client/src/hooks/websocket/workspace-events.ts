import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import useWorkspaceStore, { useFetchMembers, useFetchWorkspaces, useSwitchToFirstWorkspace } from "@/stores/workspace-store";
import useUserStore from "@/stores/user-store";
import { toast } from "sonner";
import { useInitializeSubjectAbilities } from "@/stores/ability-store";
import { showConfirmModal } from '@/components/ui/confirm-modal';
import { useTranslation } from "react-i18next";

export function useWorkspaceWebsocketEvents(socket: Socket | null) {
  const { t } = useTranslation();
  // Use the existing useFetchMembers hook
  const { run: fetchMembers } = useFetchMembers();
  const { run: fetchWorkspaces } = useFetchWorkspaces();
  const switchToFirstWorkspace = useSwitchToFirstWorkspace();
  const initializeSubjectAbilities = useInitializeSubjectAbilities();

  useEffect(() => {
    if (!socket) return;

    // ✅ Split each handler apart instead of using handlers object
    const onWorkspaceMemberAdded = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.WORKSPACE_MEMBER_ADDED}:`, message);
      const { workspaceId, member, memberAdded } = message;
      if (!workspaceId) return;

      const workspaceStore = useWorkspaceStore.getState();
      const userInfo = useUserStore.getState().userInfo;

      // If the current user was added to the workspace
      if (member?.userId === userInfo?.id) {
        // Refresh workspace members using new hooks
        fetchWorkspaces();
        toast.success(`You've been added to a workspace`);
      } else {
        // Another user was added, refresh workspace member list
        fetchWorkspaces();
      }

      // Also refresh workspace members if this is the current workspace
      if (workspaceStore.currentWorkspace?.id === workspaceId) {
        fetchMembers(workspaceId);
      }
    };

    // Note: Batch workspace member invitations no longer emit WORKSPACE_MEMBERS_BATCH_ADDED
    // Instead, when users accept invitations, individual WORKSPACE_MEMBER_ADDED events are fired
    // This handler has been removed as invitations don't add members immediately

    const onWorkspaceMemberRoleUpdated = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.WORKSPACE_MEMBER_ROLE_UPDATED}:`, message);
      const { workspaceId, userId, role, member, abilities } = message || {};
      if (!workspaceId || !userId) return;

      const userInfo = useUserStore.getState().userInfo;

      if (abilities && userInfo?.id === userId) {
        initializeSubjectAbilities(abilities);
      }

      if (userInfo?.currentWorkspaceId === workspaceId && member) {
        useWorkspaceStore.setState((state) => ({
          workspaceMembers: state.workspaceMembers.map((m) => (m.userId === userId ? { ...m, ...member, role: role ?? member.role ?? m.role } : m)),
        }));
      }
    };

    const onWorkspaceMemberLeft = async (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.WORKSPACE_MEMBER_LEFT}:`, message);
      const { workspaceId, userId, workspaceName, userRole, removedBy, memberLeft } = message || {};

      if (!workspaceId || !userId) return;

      const userInfo = useUserStore.getState().userInfo;
      const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;

      const handleCurrentUserRemoved = async (workspaceName: string) => {
        // Re-fetch workspaces to get updated state before prompting
        await fetchWorkspaces();

        // Check if user still has workspaces after refresh
        const updatedWorkspaces = useWorkspaceStore.getState().workspaces;
        const hasWorkspaces = Object.keys(updatedWorkspaces).length > 0;

        if (hasWorkspaces) {
          // Show confirmation modal
          const confirmed = await showConfirmModal({
            title: t("Workspace Access Removed"),
            description: t('You\'ve been removed from the workspace "{{workspaceName}}". Would you like to switch to another available workspace?', {
              workspaceName: workspaceName || "Unknown Workspace",
            }),
            confirmText: t("Switch Workspace"),
            cancelText: t("Stay Here"),
            confirmVariant: "default",
          });

          if (confirmed) {
            // Switch to first available workspace
            await switchToFirstWorkspace();
            toast.success(t("Workspace switched"), {
              description: t("You've been switched to another workspace."),
            });
          } else {
            // Clear current workspace state to prevent API errors
            useWorkspaceStore.setState({
              currentWorkspace: undefined,
              workspaceMembers: [],
            });
            // Also clear user store current workspace
            const userInfo = useUserStore.getState().userInfo;
            if (userInfo) {
              userInfo.currentWorkspaceId = undefined;
              useUserStore.setState({ userInfo });
            }
            // Clear localStorage
            localStorage.removeItem("workspaceId");
          }
        } else {
          // No workspaces remaining, redirect to create workspace
          const confirmed = await showConfirmModal({
            title: t("No Workspaces Available"),
            description: t("You no longer have access to any workspaces. You'll be redirected to create a new workspace."),
            confirmText: t("Create Workspace"),
            cancelText: t("Close"),
            confirmVariant: "default",
          });

          if (confirmed) {
            window.location.href = "/create-workspace";
          } else {
            // Still redirect since they have no workspaces
            window.location.href = "/create-workspace";
          }
        }
      };

      const handleOtherUserRemoved = (removedUserId: string) => {
        // Another user was removed from the current workspace - remove from store directly
        const workspaceStore = useWorkspaceStore.getState();

        // Remove the user from workspace members if they're in the current workspace
        if (workspaceStore.currentWorkspace) {
          const memberExists = workspaceStore.workspaceMembers.some((member) => member.userId === removedUserId);

          if (memberExists) {
            useWorkspaceStore.setState((state) => ({
              workspaceMembers: state.workspaceMembers.filter((member) => member.userId !== removedUserId),
            }));
          }
        }
      };

      // Handle case where current user was removed
      if (userInfo?.id === userId && currentWorkspace?.id === workspaceId) {
        // Current user was removed from their active workspace
        await handleCurrentUserRemoved(workspaceName);
      } else if (currentWorkspace?.id === workspaceId) {
        // Another user was removed from the current workspace - remove from store
        handleOtherUserRemoved(userId);
      }
    };

    // Register listeners
    socket.on(SocketEvents.WORKSPACE_MEMBER_ADDED, onWorkspaceMemberAdded);
    socket.on(SocketEvents.WORKSPACE_MEMBER_ROLE_UPDATED, onWorkspaceMemberRoleUpdated);
    socket.on(SocketEvents.WORKSPACE_MEMBER_LEFT, onWorkspaceMemberLeft);

    // Create cleanup function
    return () => {
      socket.off(SocketEvents.WORKSPACE_MEMBER_ADDED, onWorkspaceMemberAdded);
      socket.off(SocketEvents.WORKSPACE_MEMBER_ROLE_UPDATED, onWorkspaceMemberRoleUpdated);
      socket.off(SocketEvents.WORKSPACE_MEMBER_LEFT, onWorkspaceMemberLeft);
    };
  }, [socket, fetchWorkspaces, switchToFirstWorkspace, initializeSubjectAbilities, t]);
}
