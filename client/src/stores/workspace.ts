import { create } from "zustand";
import { devtools, subscribeWithSelector, persist } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { workspaceApi } from "@/apis/workspace";
import { Workspace } from "contracts";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";

export interface WorkspaceEntity extends Workspace {}

interface State {
  isLoading: boolean;
  isLoaded: boolean;
  currentWorkspace?: WorkspaceEntity;
}

interface Action {
  // API actions
  fetchList: () => Promise<WorkspaceEntity[]>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  reorderWorkspaces: (workspaceIds: string[]) => Promise<void>;

  // Helper methods
  setCurrentWorkspace: (workspace?: WorkspaceEntity) => void;
}

const defaultState: State = {
  isLoading: false,
  isLoaded: false,
  currentWorkspace: undefined,
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
                get().setAll(response);
                set({ isLoaded: true });

                // If no current workspace, set the first one as the current workspace
                if (!get().currentWorkspace) {
                  const firstWorkspace = response[0];
                  if (firstWorkspace) {
                    get().setCurrentWorkspace(firstWorkspace);
                  }
                }
              }
              return response;
            } catch (error) {
              console.error("Failed to fetch workspaces:", error);
              return [];
            } finally {
              set({ isLoading: false });
            }
          },

          switchWorkspace: async (workspaceId) => {
            try {
              const workspace = get().entities[workspaceId];
              if (workspace) {
                get().setCurrentWorkspace(workspace);
                window.location.href = "/";
              }
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

          // Helper methods
          setCurrentWorkspace: (workspace) => {
            set({ currentWorkspace: workspace });
          },
        })),
        {
          name: "workspaceStore",
        },
      ),
      {
        name: "workspace-storage",
        partialize: (state) => ({
          currentWorkspace: state.currentWorkspace,
        }),
      },
    ),
  ),
);

export default useWorkspaceStore;
