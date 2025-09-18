import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { workspaceApi } from "@/apis/workspace";
import { subspaceApi } from "@/apis/subspace";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";
import { UpdateWorkspaceRequest, WorkspaceSettings } from "@idea/contracts";

const STORE_NAME = "workspaceStore";
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
}

interface State {
  isLoading: boolean;
  isLoaded: boolean;
  currentWorkspace?: WorkspaceEntity;
  workspaceMembers: Record<string, any[]>; // workspaceId -> members array
  membersLoading: Record<string, boolean>; // workspaceId -> loading state
}

interface Action {
  // API actions
  fetchList: () => Promise<WorkspaceEntity[]>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  reorderWorkspaces: (workspaceIds: string[]) => Promise<void>;
  batchSetWorkspaceWide: (subspaceIds: string[]) => Promise<void>;
  updateWorkspace: (workspaceId: string, workspace: Partial<UpdateWorkspaceRequest>) => Promise<void>;
  updateWorkspaceSettings: (workspaceId: string, settings: Partial<WorkspaceSettings>) => Promise<void>;
  setCurrentWorkspace: (workspace?: WorkspaceEntity) => void;
  clear: () => void;

  // Workspace members
  fetchWorkspaceMembers: (workspaceId: string) => Promise<any[]>;
  batchAddWorkspaceMembers: (workspaceId: string, members: Array<{ userId: string; role: any }>) => Promise<any>;
  getWorkspaceMembers: (workspaceId: string) => any[];
  isWorkspaceMembersLoading: (workspaceId: string) => boolean;
  refreshWorkspaceMembers: (workspaceId: string) => Promise<any[]>;
}

const defaultState: State = {
  isLoading: false,
  isLoaded: false,
  currentWorkspace: undefined,
  workspaceMembers: {},
  membersLoading: {},
};

const workspaceEntitySlice = createEntitySlice<WorkspaceEntity>();
export const workspaceSelectors = workspaceEntitySlice.selectors;

type StoreState = State & Action & EntityState<WorkspaceEntity> & EntityActions<WorkspaceEntity>;

const useWorkspaceStore = create<StoreState>()(
  subscribeWithSelector(
    persist(
      devtools(
        createComputed((state: StoreState) => ({
          allWorkspaces: workspaceSelectors.selectAll(state),
        }))((set, get) => ({
          ...defaultState,
          ...workspaceEntitySlice.initialState,
          ...workspaceEntitySlice.createActions(set),

          // API actions
          fetchList: async () => {
            set({ isLoading: true });
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
                }));

                get().setAll(workspaceEntities);
                set({ isLoaded: true });

                const currentWorkspaceId = localStorage.getItem("workspaceId");
                // If no current workspace, set the first one as the current workspace
                // remove the current workspace if not matching the new workspace list in case the user have been removed from the workspace
                if (!currentWorkspaceId || !workspaceEntities.find((workspace) => workspace.id === currentWorkspaceId)) {
                  const firstWorkspace = workspaceEntities[0];
                  if (firstWorkspace) {
                    get().setCurrentWorkspace(firstWorkspace);
                    localStorage.setItem("workspaceId", firstWorkspace.id);
                  }
                } else {
                  get().setCurrentWorkspace(workspaceEntities.find((workspace) => workspace.id === currentWorkspaceId));
                }
                return workspaceEntities;
              }
              return [];
            } catch (error) {
              console.error("Failed to fetch workspaces:", error);
              return [];
            } finally {
              set({ isLoading: false });
            }
          },

          switchWorkspace: async (workspaceId) => {
            try {
              localStorage.clear();
              localStorage.setItem("workspaceId", workspaceId);
              window.location.href = "/";
            } catch (error) {
              console.error("Failed to switch workspace:", error);
            }
          },

          reorderWorkspaces: async (workspaceIds) => {
            try {
              await workspaceApi.reorderWorkspaces(workspaceIds);
              // Refresh the list to get the updated order
              await get().fetchList();
            } catch (error) {
              console.error("Failed to reorder workspaces:", error);
            }
          },

          // Subspace actions
          batchSetWorkspaceWide: async (subspaceIds) => {
            try {
              await subspaceApi.batchSetWorkspaceWide({ subspaceIds });
              // Refresh current workspace to get updated subspaces
              if (get().currentWorkspace) {
                await get().fetchList();
              }
            } catch (error) {
              console.error("Failed to batch set workspace-wide:", error);
              throw error;
            }
          },

          updateWorkspace: async (workspaceId, workspace) => {
            try {
              const oldWorkspace = get().entities[workspaceId];
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

              // Update the workspace in store with the converted data
              get().updateOne({ id: workspaceId, changes: workspaceEntity });

              // Update current workspace if it's the same
              if (get().currentWorkspace?.id === workspaceId) {
                get().setCurrentWorkspace(workspaceEntity);
              }
            } catch (error) {
              console.error("Failed to update workspace:", error);
              throw error;
            }
          },

          // Settings actions - now properly based on updateWorkspace
          updateWorkspaceSettings: async (workspaceId, settings) => {
            try {
              // Get current workspace data
              const workspace = get().entities[workspaceId];
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

              // Use updateWorkspace which handles all the store updates
              await get().updateWorkspace(workspaceId, updateData);
            } catch (error) {
              console.error("Failed to update workspace settings:", error);
              throw error;
            }
          },

          // Helper methods
          setCurrentWorkspace: (workspace) => {
            set({ currentWorkspace: workspace });
          },

          clear: () => {
            set(defaultState);
          },

          // Workspace members
          fetchWorkspaceMembers: async (workspaceId: string) => {
            try {
              // Set loading state
              set((state) => ({
                membersLoading: { ...state.membersLoading, [workspaceId]: true },
              }));

              const response = await workspaceApi.getWorkspaceMembers(workspaceId);
              const members = response || [];

              // Store members in global state
              set((state) => ({
                workspaceMembers: { ...state.workspaceMembers, [workspaceId]: members },
                membersLoading: { ...state.membersLoading, [workspaceId]: false },
              }));

              return members;
            } catch (error) {
              console.error("Failed to fetch workspace members:", error);
              // Clear loading state on error
              set((state) => ({
                membersLoading: { ...state.membersLoading, [workspaceId]: false },
              }));
              return [];
            }
          },

          batchAddWorkspaceMembers: async (workspaceId: string, members: Array<{ userId: string; role: any }>) => {
            try {
              const response = await workspaceApi.batchAddWorkspaceMembers(workspaceId, { items: members });
              return response;
            } catch (error) {
              console.error("Failed to batch add workspace members:", error);
              throw error;
            }
          },

          // Get workspace members from global state
          getWorkspaceMembers: (workspaceId: string) => {
            return get().workspaceMembers[workspaceId] || [];
          },

          // Check if workspace members are loading
          isWorkspaceMembersLoading: (workspaceId: string) => {
            return get().membersLoading[workspaceId] || false;
          },

          // Refresh workspace members (for WebSocket events)
          refreshWorkspaceMembers: async (workspaceId: string) => {
            console.log(`[workspace-store]: Refreshing members for workspace ${workspaceId}`);
            return get().fetchWorkspaceMembers(workspaceId);
          },
        })),
        {
          name: STORE_NAME,
        },
      ),
      {
        name: STORE_NAME,
      },
    ),
  ),
);

export default useWorkspaceStore;
