import { useCallback } from "react";
import useModalStore from "./modal-store";

// Global cache for modal promise callbacks
const modalCallbacks: Record<string, (value: any) => void> = {};

export interface CentralModalHook {
  args: any;
  hiding: boolean;
  visible: boolean;
  show: (args?: any) => Promise<any>;
  hide: (force?: boolean) => void;
  resolve: (value?: any) => void;
}

/**
 * Custom hook for managing modal state and operations
 * @param modalId - Unique identifier for the modal
 * @returns Modal control object with show, hide, resolve methods
 */
export function useCentralModal(modalId: string): CentralModalHook {
  const { showModal, hideModal } = useModalStore();

  // Get current modal state
  const args = useModalStore((state) => state[modalId]);
  const hiding = useModalStore((state) => state.hiding[modalId] || false);
  const visible = !!args;

  // Show modal with Promise-based API for return values
  const show = useCallback(
    (args?: any): Promise<any> => {
      return new Promise((resolve) => {
        // Store the resolve callback for this modal
        modalCallbacks[modalId] = resolve;
        // Show the modal
        showModal(modalId, args);
      });
    },
    [modalId, showModal],
  );

  // Hide modal
  const hide = useCallback(
    (force = false) => {
      hideModal(modalId, force);
    },
    [modalId, hideModal],
  );

  // Resolve modal with return value
  const resolve = useCallback(
    (value?: any) => {
      if (modalCallbacks[modalId]) {
        // Call the resolve callback with the value
        modalCallbacks[modalId](value);
        // Clean up the callback
        delete modalCallbacks[modalId];
      }
    },
    [modalId],
  );

  return {
    args,
    hiding,
    visible,
    show,
    hide,
    resolve,
  };
}
