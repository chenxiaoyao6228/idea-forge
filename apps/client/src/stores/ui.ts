import { createStore } from "./utils/factory";

const STORE_NAME = "uiStore";

interface State {
  isSidebarCollapsed: boolean;
  activeDocumentId?: string;
}

type Action = {
  setIsSidebarCollapsed: (isCollapsed: boolean) => void;
  setActiveDocumentId: (id: string) => void;
  reset: () => void;
};

type ComputedState = {};

const defaultState: State = {
  isSidebarCollapsed: false,
  activeDocumentId: undefined,
};

const useUIStore = createStore<State & Action, ComputedState>(
  (set) => ({
    ...defaultState,
    reset: () => set(defaultState),
    setIsSidebarCollapsed: (isCollapsed) => set({ isSidebarCollapsed: isCollapsed }),
    setActiveDocumentId: (id) => set({ activeDocumentId: id }),
  }),
  (state) => ({}),
  {
    devtoolOptions: {
      name: STORE_NAME,
    },
  },
);

export default useUIStore;
