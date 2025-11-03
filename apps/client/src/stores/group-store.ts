import { create } from "zustand";
import { groupApi } from "@/apis/group";
import useRequest from "@ahooksjs/use-request";
import { toast } from "sonner";
import { useMemo } from "react";
import { useRefCallback } from "@/hooks/use-ref-callback";
import useWorkspaceStore from "./workspace-store";

export interface GroupMember {
  userId: string;
  user: any;
}

export interface GroupEntity {
  id: string;
  name: string;
  description: string | null;
  members: GroupMember[];
}

interface FetchOptions {
  force?: boolean;
  prefetch?: boolean;
}

// Minimal store - only state
const useGroupStore = create<{
  groups: Record<string, GroupEntity>;
}>((set) => ({
  groups: {},
}));

// Fetch groups hook
export const useFetchGroups = () => {
  return useRequest(
    async (options: FetchOptions = {}) => {
      try {
        const { data } = await groupApi.list({
          limit: 100,
          page: 1,
          sortBy: "name",
          sortOrder: "asc",
        });
        const groups = data.map((group: any) => ({
          id: group.id,
          name: group.name,
          description: typeof group.description === "string" ? group.description : null,
          members: Array.isArray(group.members) ? group.members : [],
        }));

        useGroupStore.setState((state) => {
          const newGroups = { ...state.groups };
          groups.forEach((group) => {
            newGroups[group.id] = group;
          });
          return { groups: newGroups };
        });

        return groups;
      } catch (error) {
        console.error("Failed to fetch groups:", error);
        toast.error("Failed to fetch groups", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Create group hook
export const useCreateGroup = () => {
  return useRequest(
    async (data: { name: string; description?: string }) => {
      try {
        const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
        const response = (await groupApi.create({
          ...data,
          workspaceId: currentWorkspace?.id || "",
          description: typeof data.description === "string" ? data.description : null,
        })) as any;

        const group: GroupEntity = {
          id: response.id,
          name: response.name,
          description: typeof response.description === "string" ? response.description : null,
          members: Array.isArray(response.members) ? response.members : [],
        };

        useGroupStore.setState((state) => ({
          groups: { ...state.groups, [group.id]: group },
        }));

        toast.success("Group created successfully");
        return group;
      } catch (error) {
        console.error("Failed to create group:", error);
        toast.error("Failed to create group", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Update group hook
export const useUpdateGroup = () => {
  return useRequest(
    async (params: { id: string; data: { name?: string; description?: string } }) => {
      try {
        const response = (await groupApi.update(params.id, {
          id: params.id,
          name: params.data.name || "",
          description: typeof params.data.description === "string" ? params.data.description : null,
          validUntil: null,
        })) as any;

        const group: GroupEntity = {
          id: response.id,
          name: response.name,
          description: typeof response.description === "string" ? response.description : null,
          members: Array.isArray(response.members) ? response.members : [],
        };

        useGroupStore.setState((state) => ({
          groups: { ...state.groups, [params.id]: group },
        }));

        toast.success("Group updated successfully");
        return group;
      } catch (error) {
        console.error("Failed to update group:", error);
        toast.error("Failed to update group", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Delete group hook
export const useDeleteGroup = () => {
  return useRequest(
    async (id: string) => {
      try {
        await groupApi.delete(id);

        useGroupStore.setState((state) => {
          const newGroups = { ...state.groups };
          delete newGroups[id];
          return { groups: newGroups };
        });

        toast.success("Group deleted successfully");
        return true;
      } catch (error) {
        console.error("Failed to delete group:", error);
        toast.error("Failed to delete group", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Add user to group hook
export const useAddUserToGroup = () => {
  return useRequest(
    async (params: { groupId: string; userId: string }) => {
      try {
        const response = (await groupApi.addUser(params.groupId, { id: params.groupId, userId: params.userId })) as any;

        const group: GroupEntity = {
          id: response.id,
          name: response.name,
          description: typeof response.description === "string" ? response.description : null,
          members: Array.isArray(response.members) ? response.members : [],
        };

        useGroupStore.setState((state) => ({
          groups: { ...state.groups, [params.groupId]: group },
        }));

        toast.success("User added to group successfully");
        return group;
      } catch (error) {
        console.error("Failed to add user to group:", error);
        toast.error("Failed to add user to group", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Remove user from group hook
export const useRemoveUserFromGroup = () => {
  return useRequest(
    async (params: { groupId: string; userId: string }) => {
      try {
        const response = (await groupApi.removeUser(params.groupId, params.userId)) as any;

        const group: GroupEntity = {
          id: response.id,
          name: response.name,
          description: typeof response.description === "string" ? response.description : null,
          members: Array.isArray(response.members) ? response.members : [],
        };

        useGroupStore.setState((state) => ({
          groups: { ...state.groups, [params.groupId]: group },
        }));

        toast.success("User removed from group successfully");
        return group;
      } catch (error) {
        console.error("Failed to remove user from group:", error);
        toast.error("Failed to remove user from group", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Fetch workspace groups hook
export const useFetchWorkspaceGroups = () => {
  return useRequest(
    async (workspaceId: string) => {
      try {
        const { data } = await groupApi.list({
          limit: 1000,
          page: 1,
          sortBy: "name",
          sortOrder: "asc",
        });
        const groups = data.map((group: any) => ({
          id: group.id,
          name: group.name,
          description: typeof group.description === "string" ? group.description : null,
          members: Array.isArray(group.members) ? group.members : [],
        }));

        useGroupStore.setState((state) => {
          const newGroups = { ...state.groups };
          groups.forEach((group) => {
            newGroups[group.id] = group;
          });
          return { groups: newGroups };
        });

        return groups;
      } catch (error) {
        console.error("Failed to fetch workspace groups:", error);
        toast.error("Failed to fetch workspace groups", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Ordered groups hook - returns memoized sorted list
export const useOrderedGroups = () => {
  const groups = useGroupStore((state) => state.groups);
  return useMemo(() => {
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [groups]);
};

// Get group hook - returns memoized function
export const useGetGroup = () => {
  const groups = useGroupStore((state) => state.groups);
  return useRefCallback((id: string) => {
    return groups[id] || null;
  });
};

export default useGroupStore;
