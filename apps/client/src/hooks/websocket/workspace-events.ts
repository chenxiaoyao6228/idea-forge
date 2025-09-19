import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import useWorkspaceStore, { useFetchMembers, useFetchWorkspaces } from "@/stores/workspace-store";
import useUserStore from "@/stores/user-store";
import { toast } from "sonner";

export function useWorkspaceWebsocketEvents(socket: Socket | null): (() => void) | null {
  const cleanupRef = useRef<(() => void) | null>(null);
  // Use the existing useFetchMembers hook
  const { run: fetchMembers } = useFetchMembers();
  const { run: fetchWorkspaces } = useFetchWorkspaces();

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

    // Register listeners
    socket.on(SocketEvents.WORKSPACE_MEMBER_ADDED, onWorkspaceMemberAdded);
    socket.on(SocketEvents.WORKSPACE_MEMBERS_BATCH_ADDED, onWorkspaceMembersBatchAdded);

    // Create cleanup function
    const cleanup = () => {
      socket.off(SocketEvents.WORKSPACE_MEMBER_ADDED, onWorkspaceMemberAdded);
      socket.off(SocketEvents.WORKSPACE_MEMBERS_BATCH_ADDED, onWorkspaceMembersBatchAdded);
    };

    cleanupRef.current = cleanup;
    return cleanup;
  }, [socket, fetchMembers, fetchWorkspaces]);

  return cleanupRef.current;
}
