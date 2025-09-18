import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import useSubSpaceStore, { SubspaceEntity } from "@/stores/subspace";
import useUserStore from "@/stores/user";
import { toast } from "sonner";
import { useFetchStars } from "@/stores/star-store";

export function useSubspaceWebsocketEvents(socket: Socket | null): (() => void) | null {
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!socket) return;

    // ✅ Split each handler apart instead of using handlers object
    const onSubspaceCreate = async (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSPACE_CREATE}:`, message);
      const { name, subspace } = message;
      if (!subspace) return;

      const store = useSubSpaceStore.getState();
      const userInfo = useUserStore.getState().userInfo;

      // For WORKSPACE_WIDE subspaces, we know the current user should be a member
      const isWorkspaceWide = subspace.type === "WORKSPACE_WIDE";
      const isCreator = subspace.creatorId === userInfo?.id || message.actorId === userInfo?.id;
      const shouldBeMember = isWorkspaceWide || isCreator;

      if (shouldBeMember) {
        try {
          // Use existing fetchSubspace method from store
          await store.fetchSubspace(subspace.id);
          console.log(`[websocket]: Successfully fetched and added subspace ${subspace.id}`);
        } catch (error) {
          console.error(`[websocket]: Failed to fetch subspace ${subspace.id}:`, error);
          // Fallback: add basic subspace data
          const subspaceEntity = {
            id: subspace.id,
            name: subspace.name,
            avatar: subspace.avatar,
            workspaceId: subspace.workspaceId,
            type: subspace.type,
            index: subspace.index || "0",
            navigationTree: subspace.navigationTree || [],
            url: undefined,
            updatedAt: new Date(subspace.updatedAt),
            createdAt: new Date(subspace.createdAt),
            archivedAt: subspace.archivedAt ? new Date(subspace.archivedAt) : null,
            description: subspace.description,
            isPrivate: subspace.type === "PRIVATE",
            documentCount: 0,
            members: isWorkspaceWide ? [{ userId: userInfo?.id, role: "MEMBER" }] : [],
            memberCount: isWorkspaceWide ? 1 : 0,
          } as SubspaceEntity;

          store.addOne(subspaceEntity);
        }
      }
    };

    const onSubspaceMove = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSPACE_MOVE}:`, message);
      const { name, subspaceId, index, updatedAt } = message;
      if (!subspaceId) return;

      const store = useSubSpaceStore.getState();
      store.updateOne({
        id: subspaceId,
        changes: {
          index,
          updatedAt: new Date(updatedAt),
        },
      });
    };

    const onSubspaceMemberAdded = async (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSPACE_MEMBER_ADDED}:`, message);
      const { subspaceId, member, memberAdded } = message;
      if (!subspaceId) return;

      const subspaceStore = useSubSpaceStore.getState();
      const userInfo = useUserStore.getState().userInfo;

      // If the current user was added to the subspace
      if (member?.userId === userInfo?.id) {
        // Use existing fetchSubspace method
        await subspaceStore.fetchSubspace(subspaceId);

        // Join the subspace room for real-time updates
        if (socket) {
          socket.emit("join", `subspace:${subspaceId}`);
        }

        toast.success(`You've been added to a subspace`);
      } else {
        // Another user was added, refresh subspace member list
        // Use existing refreshSubspaceMembers method
        subspaceStore.refreshSubspaceMembers(subspaceId);
      }
    };

    const onSubspaceMembersBatchAdded = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSPACE_MEMBERS_BATCH_ADDED}:`, message);
      const { subspaceId, totalAdded, membersBatchAdded, workspaceWideSubspaces } = message;
      if (!subspaceId) return;

      // Single refresh for batch operation instead of multiple individual refreshes
      if (membersBatchAdded) {
        // If this is a workspace-wide batch operation affecting multiple subspaces
        if (workspaceWideSubspaces && Array.isArray(workspaceWideSubspaces)) {
          // Refresh all affected subspaces
          workspaceWideSubspaces.forEach((subspaceId: string) => {
            const subspaceStore = useSubSpaceStore.getState();
            subspaceStore.refreshSubspaceMembers(subspaceId);
          });
        } else {
          // Regular batch operation for a single subspace
          const subspaceStore = useSubSpaceStore.getState();
          subspaceStore.refreshSubspaceMembers(subspaceId);
        }
      }
    };

    const onSubspaceMemberLeft = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSPACE_MEMBER_LEFT}:`, message);
      const { subspaceId, userId, memberLeft, removedBy, batchRemoval } = message;
      if (!subspaceId || !userId) return;

      const subspaceStore = useSubSpaceStore.getState();
      const userInfo = useUserStore.getState().userInfo;

      // If the current user left the subspace, remove it from their local store
      if (userId === userInfo?.id) {
        subspaceStore.removeOne(subspaceId);

        // Also leave the WebSocket room
        if (socket) {
          socket.emit("leave", `subspace:${subspaceId}`);
        }

        // Show notification for self-removal
        toast.success("You have left the subspace");
      } else {
        // If another user left, refresh the subspace member list
        if (memberLeft) {
          // Use debounced refresh to prevent multiple rapid calls
          const subspaceStore = useSubSpaceStore.getState();
          subspaceStore.refreshSubspaceMembers(subspaceId);
        }
      }
    };

    const onSubspaceUpdate = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSPACE_UPDATE}:`, message);
      const { name, subspace } = message;
      if (!subspace) return;

      const store = useSubSpaceStore.getState();
      store.updateOne({
        id: subspace.id,
        changes: {
          name: subspace.name,
          avatar: subspace.avatar,
          description: subspace.description,
          updatedAt: new Date(subspace.updatedAt),
        },
      });
    };

    // Register listeners
    socket.on(SocketEvents.SUBSPACE_CREATE, onSubspaceCreate);
    socket.on(SocketEvents.SUBSPACE_MOVE, onSubspaceMove);
    socket.on(SocketEvents.SUBSPACE_MEMBER_ADDED, onSubspaceMemberAdded);
    socket.on(SocketEvents.SUBSPACE_MEMBERS_BATCH_ADDED, onSubspaceMembersBatchAdded);
    socket.on(SocketEvents.SUBSPACE_MEMBER_LEFT, onSubspaceMemberLeft);
    socket.on(SocketEvents.SUBSPACE_UPDATE, onSubspaceUpdate);

    // Return cleanup function
    return () => {
      socket.off(SocketEvents.SUBSPACE_CREATE, onSubspaceCreate);
      socket.off(SocketEvents.SUBSPACE_MOVE, onSubspaceMove);
      socket.off(SocketEvents.SUBSPACE_MEMBER_ADDED, onSubspaceMemberAdded);
      socket.off(SocketEvents.SUBSPACE_MEMBERS_BATCH_ADDED, onSubspaceMembersBatchAdded);
      socket.off(SocketEvents.SUBSPACE_MEMBER_LEFT, onSubspaceMemberLeft);
      socket.off(SocketEvents.SUBSPACE_UPDATE, onSubspaceUpdate);
    };
  }, [socket]);

  return null;
}
