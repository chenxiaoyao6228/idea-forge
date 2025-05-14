import { create } from "zustand";
import { workspaceApi } from "@/apis/workspace";
import { Workspace } from "contracts";

interface WorkspaceStoreState {
  loading: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  fetchWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
}

const useWorkspaceStore = create<WorkspaceStoreState>()((set) => ({
  loading: false,
  workspaces: [],
  currentWorkspace: null,
  fetchWorkspaces: async () => {
    set({ loading: true });
    try {
      const response = await workspaceApi.getWorkspaces();
      if (response && Array.isArray(response.workspaces)) {
        set({
          workspaces: response.workspaces,
          currentWorkspace: response.workspaces.find((w) => w.id === response.currentWorkspaceId) || null,
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
      // TODO: only fetch all related apis instead of reload
      window.location.href = "/";
    } catch (error) {
      console.error("切换工作区失败:", error);
    }
  },
}));

export default useWorkspaceStore;
