import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { createComputed } from "zustand-computed";
import { workspaceApi } from "@/apis/workspace";
import { Workspace } from "contracts";
import createEntitySlice, { EntityState, EntityActions } from "./utils/entity-slice";

export interface WorkspaceEntity extends Workspace {}

interface State {
  isLoading: boolean;
  isLoaded: boolean;
  currentWorkspaceId?: string;
}

interface Action {
  // API actions
  fetchList: () => Promise<WorkspaceEntity[]>;
  switchWorkspace: (workspaceId: string) => Promise<void>;

  // Helper methods
  setCurrentWorkspace: (id?: string) => void;
}

const defaultState: State = {
  isLoading: false,
  isLoaded: false,
  currentWorkspaceId: undefined,
};

const workspaceEntitySlice = createEntitySlice<WorkspaceEntity>();
export const workspaceSelectors = workspaceEntitySlice.selectors;

type StoreState = State & Action & EntityState<WorkspaceEntity> & EntityActions<WorkspaceEntity>;

const useWorkspaceStore = create<StoreState>()(
  subscribeWithSelector(
    devtools(
      createComputed((state: StoreState) => ({
        currentWorkspace: state.currentWorkspaceId ? state.entities[state.currentWorkspaceId] : undefined,
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
              if (!get().currentWorkspaceId) {
                set({ currentWorkspaceId: response[0]?.id });
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
              set({ currentWorkspaceId: workspaceId });
              window.location.href = "/";
            }
          } catch (error) {
            console.error("Failed to switch workspace:", error);
          }
        },

        // Helper methods
        setCurrentWorkspace: (id) => {
          set({ currentWorkspaceId: id });
        },
      })),
      {
        name: "workspaceStore",
      },
    ),
  ),
);

export default useWorkspaceStore;
