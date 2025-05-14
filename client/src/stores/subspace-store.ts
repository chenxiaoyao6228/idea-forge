import { create } from "zustand";
import createSelectors from "./utils/create-selectors";
import { Subspace } from "contracts";

interface SubspaceStoreSate {
  subspaces: Subspace[];
}

interface SubspaceStoreAction {
  setSubspaces: (subspaces: Subspace[]) => void;
}

const defaultState: SubspaceStoreSate = {
  subspaces: [],
};

const store = create<SubspaceStoreSate & SubspaceStoreAction>()((set) => ({
  ...defaultState,
  setSubspaces: (subspaces: Subspace[]) => set({ subspaces }),
  resetStore: () => set(defaultState),
}));

export const useSubSpaceStore = createSelectors(store);
