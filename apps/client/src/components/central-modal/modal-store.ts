import { createStore } from "../../stores/utils/factory";

const STORE_NAME = "modalStore";

interface ModalState {
  // Modal visibility state - key is modalId, value is args or true
  [modalId: string]: any;
  // Modal hiding state for animations - key is modalId, value is boolean
  hiding: Record<string, boolean>;
}

interface ModalActions {
  showModal: (modalId: string, args?: any) => void;
  hideModal: (modalId: string, force?: boolean) => void;
  reset: () => void;
}

type ComputedState = {};

const defaultState: ModalState = {
  hiding: {},
};

const useModalStore = createStore<ModalState & ModalActions, ComputedState>(
  (set) => ({
    ...defaultState,
    reset: () => set(defaultState),
    showModal: (modalId, args) =>
      set((state) => ({
        [modalId]: args || true,
        hiding: {
          ...state.hiding,
          [modalId]: false,
        },
      })),
    hideModal: (modalId, force = false) =>
      set((state) => {
        if (force) {
          const newState = { ...state };
          delete newState[modalId];
          newState.hiding = { ...state.hiding, [modalId]: false };
          return newState;
        }
        return {
          ...state,
          hiding: { ...state.hiding, [modalId]: true },
        };
      }),
  }),
  (state) => ({}),
  {
    devtoolOptions: {
      name: STORE_NAME,
    },
  },
);

export default useModalStore;