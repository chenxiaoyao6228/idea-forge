import { create } from "zustand";
import createSelectors from "./utils/create-selectors";
import { Subspace } from "contracts";

interface Sate {
  subspaces: Subspace[];
}

interface Action {
  setSubspaces: (subspaces: Subspace[]) => void;
  setStore: (state: Partial<Sate>) => void;
  resetStore: () => void;
}

const defaultState: Sate = {
  subspaces: [],
};

const store = create<Sate & Action>()((set) => ({
  ...defaultState,
  setSubspaces: (subspaces: Subspace[]) => set({ subspaces }),
  setStore: (state) => set(state),
  resetStore: () => set(defaultState),
}));

// Computed selectors

export const useSubSpaceStore = createSelectors(store);
