import { createStore } from "./utils/factory";

interface State {
  isSidebarCollapsed: boolean;
  activeDocumentId?: string;
}

type Action = {
  setIsSidebarCollapsed: (isCollapsed: boolean) => void;
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
  }),
  (state) => ({}),
  {
    devtoolOptions: {
      name: "UI Store",
    },
  },
);

export default useUIStore;
