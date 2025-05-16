import { createStore } from "./utils/creator";
import { Subspace } from "contracts";

interface State {
  subspaces: Subspace[];
}

interface Action {
  setSubspaces: (subspaces: Subspace[]) => void;
}

type ComputedState = {};

const defaultState: State = {
  subspaces: [],
};

const useSubSpaceStore = createStore<State & Action, ComputedState>(
  (set) => ({
    ...defaultState,
    setSubspaces: (subspaces) => set({ subspaces }),
  }),
  (state) => ({}),
  {
    devtoolOptions: {
      name: "subspaceStore",
    },
  },
);

export default useSubSpaceStore;
