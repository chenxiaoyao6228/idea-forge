import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import useWorkspaceStore, { useFetchMembers, useFetchWorkspaces } from "@/stores/workspace-store";
import useUserStore from "@/stores/user-store";
import { toast } from "sonner";
import { useInitializeSubjectAbilities } from "@/stores/ability-store";

export function useWorkspaceWebsocketEvents(socket: Socket | null): (() => void) | null {
  const cleanupRef = useRef<(() => void) | null>(null);
  // Use the existing useFetchMembers hook
  const { run: fetchMembers } = useFetchMembers();
  const { run: fetchWorkspaces } = useFetchWorkspaces();
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

    const onWorkspaceMembersBatchAdded = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.WORKSPACE_MEMBERS_BATCH_ADDED}:`, message);
      const { workspaceId, totalAdded, membersBatchAdded } = message;
      if (!workspaceId) return;

      // Single refresh for batch operation instead of multiple individual refreshes
      if (membersBatchAdded) {
        const workspaceStore = useWorkspaceStore.getState();
        fetchWorkspaces();

        // Also refresh workspace members if this is the current workspace
        if (workspaceStore.currentWorkspace?.id === workspaceId) {
          fetchMembers(workspaceId);
        }
      }
    };

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

    // Register listeners
    socket.on(SocketEvents.WORKSPACE_MEMBER_ADDED, onWorkspaceMemberAdded);
    socket.on(SocketEvents.WORKSPACE_MEMBERS_BATCH_ADDED, onWorkspaceMembersBatchAdded);
    socket.on(SocketEvents.WORKSPACE_MEMBER_ROLE_UPDATED, onWorkspaceMemberRoleUpdated);

    // Create cleanup function
    const cleanup = () => {
      socket.off(SocketEvents.WORKSPACE_MEMBER_ADDED, onWorkspaceMemberAdded);
      socket.off(SocketEvents.WORKSPACE_MEMBERS_BATCH_ADDED, onWorkspaceMembersBatchAdded);
      socket.off(SocketEvents.WORKSPACE_MEMBER_ROLE_UPDATED, onWorkspaceMemberRoleUpdated);
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, [socket, fetchMembers, fetchWorkspaces, initializeSubjectAbilities]);

  return cleanupRef.current;
}
