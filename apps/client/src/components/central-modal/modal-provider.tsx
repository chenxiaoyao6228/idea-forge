import React from "react";
import { createPortal } from "react-dom";

interface ModalProviderProps {
  children: React.ReactNode;
  modals: React.ReactNode[];
}

/**
 * ModalProvider component that renders all registered modals
 * This should be placed at the root of your application
 */
export function ModalProvider({ children, modals }: ModalProviderProps) {
  const modalRoot = typeof document !== "undefined" ? document.body : null;

  return (
    <>
      {children}
      {modalRoot && modals.map((modal, index) => createPortal(modal, modalRoot, `modal-${index}`))}
    </>
  );
}
