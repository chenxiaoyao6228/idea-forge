import React from "react";
import { useCentralModal } from "./use-central-modal";

/**
 * Higher-order component that creates a modal component with CentralModal functionality
 * @param modalId - Unique identifier for the modal
 * @param Component - The actual modal component to render
 * @returns A component that can be used anywhere in the app
 */
export function createCentralModal<T = any>(modalId: string, Component: React.ComponentType<T>): React.ComponentType<Omit<T, "modal"> & { modal?: any }> {
  return function CentralModalWrapper(props) {
    const modal = useCentralModal(modalId);

    // Don't render if modal is not visible
    if (!modal.visible) {
      return null;
    }

    // Pass modal control object and args to the component
    return <Component {...props} modal={modal} {...modal.args} />;
  };
}
