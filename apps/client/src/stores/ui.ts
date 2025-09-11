import { createStore } from "./utils/factory";

const STORE_NAME = "uiStore";

interface State {
  isSidebarCollapsed: boolean;
  activeDocumentId?: string;

  // setting dialog
  isSettingDialogOpen: boolean;
  activeSettingDialogTab: string;
  settingDialogActiveSubspaceId?: string;
}

type Action = {
  setIsSidebarCollapsed: (isCollapsed: boolean) => void;
  setActiveDocumentId: (id: string) => void;
  openSettingDialog: (tab: string, subspaceId?: string) => void;
  closeSettingDialog: () => void;
  updateStore: (updates: Partial<State>) => void;
  reset: () => void;
};

type ComputedState = {};

const defaultState: State = {
  isSidebarCollapsed: false,
  activeDocumentId: undefined,

  // setting dialog
  isSettingDialogOpen: false,
  activeSettingDialogTab: "subspace",
  settingDialogActiveSubspaceId: undefined,
};

const useUIStore = createStore<State & Action, ComputedState>(
  (set) => ({
    ...defaultState,
    reset: () => set(defaultState),
    setIsSidebarCollapsed: (isCollapsed) => set({ isSidebarCollapsed: isCollapsed }),
    setActiveDocumentId: (id) => set({ activeDocumentId: id }),
    openSettingDialog: (tab, subspaceId) =>
      set({
        isSettingDialogOpen: true,
        activeSettingDialogTab: tab,
        settingDialogActiveSubspaceId: subspaceId ?? defaultState.settingDialogActiveSubspaceId,
      }),
    closeSettingDialog: () =>
      set({
        isSettingDialogOpen: false,
        activeSettingDialogTab: defaultState.activeSettingDialogTab,
        settingDialogActiveSubspaceId: defaultState.settingDialogActiveSubspaceId,
      }),
    updateStore: (updates) => set(updates),
  }),
  (state) => ({}),
  {
    devtoolOptions: {
      name: STORE_NAME,
    },
  },
);

export default useUIStore;
