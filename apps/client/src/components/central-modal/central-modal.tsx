import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { useCentralModal, CentralModalHook } from "./use-central-modal";
import { cn } from "@/lib/utils";

export interface CentralModalProps {
  id: string;
  children: React.ReactNode;
  type?: "dialog" | "alert";
  className?: string;
  onOpenChange?: (open: boolean) => void;
  // Allow passing through any additional props to the underlying Dialog/AlertDialog
  [key: string]: any;
}

/**
 * CentralModal component that provides a unified interface for modal management
 * Supports both Dialog and AlertDialog types from Shadcn UI
 */
export function CentralModal({ id, children, type = "dialog", className, onOpenChange, ...props }: CentralModalProps) {
  const modal = useCentralModal(id);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      modal.hide();
    }
    onOpenChange?.(open);
  };

  const handleAfterClose = () => {
    // Force hide after animation completes
    modal.hide(true);
  };

  const contentProps = {
    className: cn(className),
    ...props,
  };

  if (type === "alert") {
    return (
      <AlertDialog open={modal.visible && !modal.hiding} onOpenChange={handleOpenChange}>
        <AlertDialogContent {...contentProps}>{children}</AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={modal.visible && !modal.hiding} onOpenChange={handleOpenChange}>
      <DialogContent {...contentProps} onAnimationEnd={handleAfterClose}>
        {children}
      </DialogContent>
    </Dialog>
  );
}
