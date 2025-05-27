import { createStore } from "./utils/factory";

interface DemoState {
  count: number;
  countDown: number;
}
interface DemoActions {
  increment: () => void;
  decrement: () => void;
}

interface DemoComputed {
  isEven: boolean;
}

const defaultStore: DemoState = {
  count: 0,
  countDown: 0,
};

const useTestStore = createStore<DemoState & DemoActions, DemoComputed>(
  (set, get) => ({
    ...defaultStore,
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
  }),
  (state) => ({
    isEven: state.count % 2 === 0,
  }),
  {
    devtoolOptions: {
      name: "testStore",
    },
    persistOptions: {
      name: "testStore",
      version: 1,
      migrate: (persistedState) => {
        return persistedState;
      },
      partialize: (state: any) => ({ count: state.count }),
    },
  },
);

export default useTestStore;
