import React from "react";
import { createPortal } from "react-dom";
import { getRegisteredModalIds, getModal } from "./modal-registry";
import useModalStore from "./modal-store";

interface AutoModalProviderProps {
  children: React.ReactNode;
}

/**
 * AutoModalProvider automatically renders all registered modals
 * This component will render any modal that is currently visible
 * based on the modal store state
 */
export function AutoModalProvider({ children }: AutoModalProviderProps) {
  const modalState = useModalStore();
  const modalRoot = typeof document !== "undefined" ? document.body : null;

  // Get all visible modals
  const visibleModals = getRegisteredModalIds()
    .filter((modalId) => {
      const isVisible = !!modalState[modalId];
      const isHiding = modalState.hiding[modalId];
      return isVisible && !isHiding;
    })
    .map((modalId) => {
      const ModalComponent = getModal(modalId);
      if (!ModalComponent) return null;

      return <ModalComponent key={modalId} />;
    })
    .filter(Boolean);

  return (
    <>
      {children}
      {modalRoot && visibleModals.map((modal, index) => createPortal(modal, modalRoot, `auto-modal-${index}`))}
    </>
  );
}
