import { createStore } from "./utils/factory";
import { workspaceApi } from "@/apis/workspace";
import { Workspace } from "contracts";

interface State {
  loading: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
}

interface Actions {
  fetchWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

type ComputedState = {};

const defaultState: State = {
  loading: false,
  workspaces: [],
  currentWorkspace: null,
};

const useWorkspaceStore = createStore<State & Actions, ComputedState>(
  (set, get) => ({
    ...defaultState,
    fetchWorkspaces: async () => {
      set({ loading: true });
      try {
        const response = await workspaceApi.getWorkspaces();

        if (response && Array.isArray(response)) {
          set({
            workspaces: response,
            currentWorkspace: response[0],
          });
        }
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
      } finally {
        set({ loading: false });
      }
    },
    switchWorkspace: async (workspaceId) => {
      try {
        await workspaceApi.switchWorkspace(workspaceId);
        window.location.href = "/";
      } catch (error) {
        console.error("切换工作区失败:", error);
      }
    },
  }),
  (state) => ({}),
  {
    devtoolOptions: {
      name: "workspaceStore",
    },
    persistOptions: {
      name: "workspaceStore",
      version: 1,
      partialize: (state: any) => ({
        currentWorkspace: state.currentWorkspace,
      }),
    },
  },
);

export default useWorkspaceStore;
