import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { SocketEvents } from "@/lib/websocket";
import useSubSpaceStore, { SubspaceEntity, useFetchSubspace } from "@/stores/subspace-store";
import useUserStore from "@/stores/user-store";
import { toast } from "sonner";
import { useFetchStars } from "@/stores/star-store";

export function useSubspaceWebsocketEvents(socket: Socket | null) {
  const fetchSubspace = useFetchSubspace();

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
          // Fetch the complete subspace data from the server
          await fetchSubspace.run(subspace.id);
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

          // Add subspace to store
          useSubSpaceStore.setState((state) => ({
            subspaces: { ...state.subspaces, [subspaceEntity.id]: subspaceEntity },
          }));
        }
      }
    };

    const onSubspaceMove = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSPACE_MOVE}:`, message);
      const { name, subspaceId, index, updatedAt } = message;
      if (!subspaceId) return;

      const store = useSubSpaceStore.getState();
      // Update subspace index
      useSubSpaceStore.setState((state) => ({
        subspaces: {
          ...state.subspaces,
          [subspaceId]: {
            ...state.subspaces[subspaceId],
            index,
            updatedAt: new Date(updatedAt),
          },
        },
      }));
    };

    const onSubspaceMemberAdded = async (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSPACE_MEMBER_ADDED}:`, message);
      const { subspaceId, member, memberAdded } = message;
      if (!subspaceId) return;

      const subspaceStore = useSubSpaceStore.getState();
      const userInfo = useUserStore.getState().userInfo;

      // If the current user was added to the subspace
      if (member?.userId === userInfo?.id) {
        try {
          // Fetch the complete subspace data from the server
          await fetchSubspace.run(subspaceId);

          // Join the subspace room for real-time updates
          if (socket) {
            socket.emit("join", `subspace:${subspaceId}`);
          }

          toast.success(`You've been added to a subspace`);
        } catch (error) {
          console.error(`[websocket]: Failed to fetch subspace ${subspaceId} after member added:`, error);
        }
      } else {
        // Another user was added, refresh subspace member list
        try {
          await fetchSubspace.run(subspaceId);
        } catch (error) {
          console.error(`[websocket]: Failed to refresh subspace ${subspaceId} after member added:`, error);
        }
      }
    };

    const onSubspaceMembersBatchAdded = async (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSPACE_MEMBERS_BATCH_ADDED}:`, message);
      const { subspaceId, totalAdded, membersBatchAdded, workspaceWideSubspaces } = message;
      if (!subspaceId) return;

      // Single refresh for batch operation instead of multiple individual refreshes
      if (membersBatchAdded) {
        // If this is a workspace-wide batch operation affecting multiple subspaces
        if (workspaceWideSubspaces && Array.isArray(workspaceWideSubspaces)) {
          // Refresh all affected subspaces
          for (const subspaceId of workspaceWideSubspaces) {
            try {
              await fetchSubspace.run(subspaceId);
            } catch (error) {
              console.error(`[websocket]: Failed to refresh subspace ${subspaceId} after batch member added:`, error);
            }
          }
        } else {
          // Regular batch operation for a single subspace
          try {
            await fetchSubspace.run(subspaceId);
          } catch (error) {
            console.error(`[websocket]: Failed to refresh subspace ${subspaceId} after batch member added:`, error);
          }
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
        // Remove subspace from store
        useSubSpaceStore.setState((state) => {
          const newSubspaces = { ...state.subspaces };
          delete newSubspaces[subspaceId];
          return { subspaces: newSubspaces };
        });

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
          // Note: Members will be refreshed via normal flow
          // subspaceStore.refreshSubspaceMembers(subspaceId);
        }
      }
    };

    const onSubspaceUpdate = (message: any) => {
      console.log(`[websocket]: Received event ${SocketEvents.SUBSPACE_UPDATE}:`, message);
      const { name, subspace } = message;
      if (!subspace) return;

      const store = useSubSpaceStore.getState();
      // Update subspace info
      useSubSpaceStore.setState((state) => ({
        subspaces: {
          ...state.subspaces,
          [subspace.id]: {
            ...state.subspaces[subspace.id],
            name: subspace.name,
            avatar: subspace.avatar,
            description: subspace.description,
            updatedAt: new Date(subspace.updatedAt),
          },
        },
      }));
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
  }, [socket, fetchSubspace]);
}
