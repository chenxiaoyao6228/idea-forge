import { createStore } from "./utils/factory";

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
    setIsSidebarCollapsed: (isCollapsed: boolean) => set({ isSidebarCollapsed: isCollapsed }),
    setActiveDocumentId: (id: string) => set({ activeDocumentId: id }),
  }),
  (state) => ({}),
  {
    devtoolOptions: {
      name: "uiStore",
    },
  },
);

export default useUIStore;
