import { create } from "zustand";
import { workspaceApi } from "@/apis/workspace";
import { subspaceApi } from "@/apis/subspace";
import { UpdateWorkspaceRequest, WorkspaceSettings, WorkspaceMemberListResponse, WorkspaceAccessLevel } from "@idea/contracts";
import useRequest from "@ahooksjs/use-request";
import { useRefCallback } from "@/hooks/use-ref-callback";
import useUserStore from "./user-store";

export interface WorkspaceEntity {
  id: string;
  name: string;
  avatar?: string | null;
  description?: string | null;
  allowPublicDocs?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  settings?: WorkspaceSettings | null;
  memberSubspaceCreate?: boolean;
  type?: "PERSONAL" | "TEAM";
  accessLevel?: WorkspaceAccessLevel;
}

// Minimal Zustand store
const useWorkspaceStore = create<{
  currentWorkspace?: WorkspaceEntity;
  workspaceMembers: WorkspaceMemberListResponse;
  workspaces: Record<string, WorkspaceEntity>;
}>((set) => ({
  currentWorkspace: undefined,
  workspaceMembers: [],
  workspaces: {},
}));

// Data Access Hooks
export const useCurrentWorkspace = () => {
  const userInfo = useUserStore((state) => state.userInfo);
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  if (userInfo?.currentWorkspaceId) {
    return workspaces[userInfo.currentWorkspaceId];
  }

  // Fallback: get from localStorage for backward compatibility
  const workspaceId = localStorage.getItem("workspaceId");
  if (workspaceId) {
    return workspaces[workspaceId];
  }

  return undefined;
};
export const useWorkspaceMembers = () => useWorkspaceStore((state) => state.workspaceMembers);
export const useAllWorkspaces = () => {
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  return Object.values(workspaces);
};

// Computed Value Hooks
export const useWorkspaces = () => {
  return useWorkspaceStore((state) => state.workspaces);
};

export const useGetWorkspaceById = () => {
  return useRefCallback((workspaceId: string) => {
    return useWorkspaceStore.getState().workspaces[workspaceId];
  });
};

export const useIsCurrentWorkspace = () => {
  return useRefCallback((workspaceId: string) => {
    const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
    return currentWorkspace?.id === workspaceId;
  });
};

// CRUD Operation Hooks
export const useFetchWorkspaces = () => {
  return useRequest(
    async () => {
      try {
        const response = await workspaceApi.getWorkspaces();
        if (response && Array.isArray(response)) {
          // Convert API response to WorkspaceEntity format
          const workspaceEntities: WorkspaceEntity[] = response.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            avatar: workspace.avatar,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
            memberSubspaceCreate: workspace.memberSubspaceCreate,
            settings: workspace.settings as WorkspaceSettings | null,
            type: workspace.type,
            accessLevel: workspace.accessLevel,
          }));

          // Update store with all workspaces
          const workspacesMap = workspaceEntities.reduce(
            (acc, workspace) => {
              acc[workspace.id] = workspace;
              return acc;
            },
            {} as Record<string, WorkspaceEntity>,
          );

          useWorkspaceStore.setState({ workspaces: workspacesMap });

          // Get current workspace from user info first, then fallback to localStorage
          const userInfo = useUserStore.getState().userInfo;
          const currentWorkspaceId = userInfo?.currentWorkspaceId || localStorage.getItem("workspaceId");

          // If no current workspace, set the first one as the current workspace
          // remove the current workspace if not matching the new workspace list in case the user have been removed from the workspace
          if (!currentWorkspaceId || !workspaceEntities.find((workspace) => workspace.id === currentWorkspaceId)) {
            const firstWorkspace = workspaceEntities[0];
            if (firstWorkspace) {
              useWorkspaceStore.setState({ currentWorkspace: firstWorkspace });
              localStorage.setItem("workspaceId", firstWorkspace.id);

              // Update user info with current workspace
              if (userInfo) {
                userInfo.currentWorkspaceId = firstWorkspace.id;
                useUserStore.setState({ userInfo });
              }
            }
          } else {
            const currentWorkspace = workspaceEntities.find((workspace) => workspace.id === currentWorkspaceId);
            if (currentWorkspace) {
              useWorkspaceStore.setState({ currentWorkspace });
              localStorage.setItem("workspaceId", currentWorkspace.id);
            }
          }
          return workspaceEntities;
        }
        return [];
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useSwitchWorkspace = () => {
  return useRequest(
    async (workspaceId: string) => {
      try {
        // Call the new API to switch workspace
        await workspaceApi.switchWorkspace(workspaceId);

        // Update user store with new currentWorkspaceId
        const userInfo = useUserStore.getState().userInfo;
        if (userInfo) {
          userInfo.currentWorkspaceId = workspaceId;
          useUserStore.setState({ userInfo });
        }

        // Update workspace store current workspace
        const workspaces = useWorkspaceStore.getState().workspaces;
        const newCurrentWorkspace = workspaces[workspaceId];
        if (newCurrentWorkspace) {
          useWorkspaceStore.setState({ currentWorkspace: newCurrentWorkspace });
        }

        // Keep localStorage for backward compatibility
        localStorage.setItem("workspaceId", workspaceId);

        // Refresh the page to ensure all components get the new workspace context
        window.location.href = "/";
      } catch (error) {
        console.error("Failed to switch workspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useReorderWorkspaces = () => {
  return useRequest(
    async (workspaceIds: string[]) => {
      try {
        await workspaceApi.reorderWorkspaces(workspaceIds);
        // Refresh the list to get the updated order
        const response = await workspaceApi.getWorkspaces();
        if (response && Array.isArray(response)) {
          const workspaceEntities: WorkspaceEntity[] = response.map((workspace) => ({
            id: workspace.id,
            name: workspace.name,
            description: workspace.description,
            avatar: workspace.avatar,
            createdAt: workspace.createdAt,
            updatedAt: workspace.updatedAt,
            memberSubspaceCreate: workspace.memberSubspaceCreate,
            settings: workspace.settings as WorkspaceSettings | null,
            type: workspace.type,
            accessLevel: workspace.accessLevel,
          }));

          const workspacesMap = workspaceEntities.reduce(
            (acc, workspace) => {
              acc[workspace.id] = workspace;
              return acc;
            },
            {} as Record<string, WorkspaceEntity>,
          );

          useWorkspaceStore.setState({ workspaces: workspacesMap });
        }
      } catch (error) {
        console.error("Failed to reorder workspaces:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useUpdateWorkspace = () => {
  return useRequest(
    async ({ workspaceId, workspace }: { workspaceId: string; workspace: Partial<UpdateWorkspaceRequest> }) => {
      try {
        const oldWorkspace = useWorkspaceStore.getState().workspaces[workspaceId];
        const updatedWorkspace = await workspaceApi.updateWorkspace(workspaceId, {
          ...oldWorkspace,
          ...workspace,
        } as UpdateWorkspaceRequest);

        // Convert the returned workspace to WorkspaceEntity format
        const workspaceEntity: WorkspaceEntity = {
          id: updatedWorkspace.id,
          name: updatedWorkspace.name,
          description: updatedWorkspace.description,
          avatar: updatedWorkspace.avatar,
          createdAt: updatedWorkspace.createdAt,
          updatedAt: updatedWorkspace.updatedAt,
          memberSubspaceCreate: updatedWorkspace.memberSubspaceCreate,
          settings: updatedWorkspace.settings as WorkspaceSettings | null,
          type: updatedWorkspace.type,
        };

        // Update the workspace in store
        useWorkspaceStore.setState((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspaceId]: workspaceEntity,
          },
        }));

        // Update current workspace if it's the same
        const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
        if (currentWorkspace?.id === workspaceId) {
          useWorkspaceStore.setState({ currentWorkspace: workspaceEntity });
        }

        return workspaceEntity;
      } catch (error) {
        console.error("Failed to update workspace:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useUpdateWorkspaceSettings = () => {
  return useRequest(
    async ({ workspaceId, settings }: { workspaceId: string; settings: Partial<WorkspaceSettings> }) => {
      try {
        // Get current workspace data
        const workspace = useWorkspaceStore.getState().workspaces[workspaceId];
        if (!workspace) {
          throw new Error("Workspace not found");
        }

        // Prepare update data with current workspace info + new settings
        const updateData: UpdateWorkspaceRequest = {
          name: workspace.name,
          description: workspace.description || null,
          avatar: workspace.avatar || null,
          memberSubspaceCreate: workspace.memberSubspaceCreate || false,
          settings: { ...workspace.settings, ...settings },
        };

        // Call API directly and update store
        const updatedWorkspace = await workspaceApi.updateWorkspace(workspaceId, updateData);

        // Convert the returned workspace to WorkspaceEntity format
        const workspaceEntity: WorkspaceEntity = {
          id: updatedWorkspace.id,
          name: updatedWorkspace.name,
          description: updatedWorkspace.description,
          avatar: updatedWorkspace.avatar,
          createdAt: updatedWorkspace.createdAt,
          updatedAt: updatedWorkspace.updatedAt,
          memberSubspaceCreate: updatedWorkspace.memberSubspaceCreate,
          settings: updatedWorkspace.settings as WorkspaceSettings | null,
          type: updatedWorkspace.type,
        };

        // Update the workspace in store
        useWorkspaceStore.setState((state) => ({
          workspaces: {
            ...state.workspaces,
            [workspaceId]: workspaceEntity,
          },
        }));

        // Update current workspace if it's the same
        const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
        if (currentWorkspace?.id === workspaceId) {
          useWorkspaceStore.setState({ currentWorkspace: workspaceEntity });
        }

        return workspaceEntity;
      } catch (error) {
        console.error("Failed to update workspace settings:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useBatchAddWorkspaceMembers = () => {
  return useRequest(
    async ({ workspaceId, members }: { workspaceId: string; members: Array<{ userId: string; role: any }> }) => {
      try {
        const response = await workspaceApi.batchAddWorkspaceMembers(workspaceId, { items: members });
        return response;
      } catch (error) {
        console.error("Failed to batch add workspace members:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export const useBatchSetWorkspaceWide = () => {
  return useRequest(
    async (subspaceIds: string[]) => {
      try {
        await subspaceApi.batchSetWorkspaceWide({ subspaceIds });
        // Refresh current workspace to get updated subspaces
        const currentWorkspace = useWorkspaceStore.getState().currentWorkspace;
        if (currentWorkspace) {
          const response = await workspaceApi.getWorkspaces();
          if (response && Array.isArray(response)) {
            const workspaceEntities: WorkspaceEntity[] = response.map((workspace) => ({
              id: workspace.id,
              name: workspace.name,
              description: workspace.description,
              avatar: workspace.avatar,
              createdAt: workspace.createdAt,
              updatedAt: workspace.updatedAt,
              memberSubspaceCreate: workspace.memberSubspaceCreate,
              settings: workspace.settings as WorkspaceSettings | null,
              type: workspace.type,
            }));

            const workspacesMap = workspaceEntities.reduce(
              (acc, workspace) => {
                acc[workspace.id] = workspace;
                return acc;
              },
              {} as Record<string, WorkspaceEntity>,
            );

            useWorkspaceStore.setState({ workspaces: workspacesMap });
          }
        }
      } catch (error) {
        console.error("Failed to batch set workspace-wide:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

// Helper Hooks
export const useSetCurrentWorkspace = () => {
  return useRefCallback((workspace?: WorkspaceEntity) => {
    const userInfo = useUserStore.getState().userInfo;
    if (userInfo) {
      userInfo.currentWorkspaceId = workspace?.id;
      useUserStore.setState({ userInfo });
    }
  });
};

export const useClearWorkspace = () => {
  return useRefCallback(() => {
    useWorkspaceStore.setState({
      currentWorkspace: undefined,
      workspaceMembers: [],
      workspaces: {},
    });
  });
};

// Hook for fetching workspace members
export const useFetchMembers = () => {
  return useRequest(
    async (workspaceId: string) => {
      try {
        const response = await workspaceApi.getWorkspaceMembers(workspaceId);
        const members = response || [];

        useWorkspaceStore.setState({
          workspaceMembers: members,
        });

        return members;
      } catch (error) {
        console.error("Failed to fetch workspace members:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

export default useWorkspaceStore;
