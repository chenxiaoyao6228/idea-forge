/*
 * Shadcn Dialog has lots of drawback
 * eg: inside of Dropdown closes automatically, see: https://stackoverflow.com/questions/77185827/shadcn-dialog-inside-of-dropdown-closes-automatically
 * or dialog over dialog does not close somehow
 * So we use react-confirm to create a custom confirm modal, instead of using AlertDialog/Dialog directly from shadcn/ui
 */

import * as React from "react";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import { useKey } from "react-use";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ButtonProps } from "@/components/ui/button";
import { useState } from "react";

export interface ConfirmModalProps {
  // basic info
  title?: string;
  description?: string;
  content?: React.ReactNode;

  // button related
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: ButtonProps["variant"];
  cancelVariant?: ButtonProps["variant"];
  hideCancel?: boolean;
  hideFooter?: boolean;
  footer?: React.ReactNode;

  // style related
  width?: number;
  className?: string;
  icon?: React.ReactNode;

  // callback functions
  onConfirm?: () => Promise<boolean> | boolean;
  onCancel?: () => Promise<boolean> | boolean;

  // type
  type?: "alert" | "dialog";

  // react-confirm
  show?: boolean;
  proceed?: (value: boolean) => void;
}

const ConfirmModal: React.FC<ConfirmDialogProps<ConfirmModalProps, boolean>> = ({
  show = false,
  proceed,
  title,
  description,
  confirmText,
  cancelText,
  confirmVariant = "default",
  cancelVariant = "outline",
  hideCancel = false,
  width,
  className,
  icon,
  onConfirm,
  onCancel,
  type = "alert",
  content,
  footer,
  hideFooter = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleAction = async (action: (() => Promise<boolean> | boolean) | undefined, value: boolean) => {
    if (action) {
      setIsLoading(true);
      try {
        const result = await action();
        if (!(result === false)) {
          proceed?.(value);
        }
      } catch (error) {
        console.error("Modal action error:", error);
      } finally {
        setIsLoading(false);
      }
    } else {
      proceed?.(value);
    }
  };

  const handleConfirm = () => handleAction(onConfirm, true);
  const handleCancel = () => handleAction(onCancel, false);

  useKey(
    "Enter",
    (e) => {
      if (!isLoading && show) {
        e.preventDefault();
        handleConfirm();
      }
    },
    {},
    [isLoading, show, handleConfirm],
  );

  const contentProps = {
    className: cn(
      {
        [`w-[${width}px]`]: width,
      },
      className,
    ),
  };

  const headerContent = (
    <>
      {title && (
        <div className="flex items-center gap-2">
          {icon}
          {title}
        </div>
      )}
    </>
  );

  const footerContent = (
    <>
      {!hideCancel && (
        <Button variant={cancelVariant} onClick={handleCancel} disabled={isLoading}>
          {t("Cancel") || cancelText}
        </Button>
      )}
      <Button variant={confirmVariant} onClick={handleConfirm} disabled={isLoading}>
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {t("Confirm") || confirmText}
      </Button>
    </>
  );

  if (type === "alert") {
    return (
      <AlertDialog open={show} onOpenChange={(open) => !open && handleCancel()}>
        <AlertDialogContent {...contentProps}>
          <AlertDialogHeader>
            {title && <AlertDialogTitle>{headerContent}</AlertDialogTitle>}
            {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
          </AlertDialogHeader>
          {content}
          {!hideFooter && <AlertDialogFooter>{footer || footerContent}</AlertDialogFooter>}
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent {...contentProps}>
        <DialogHeader>
          {title && <DialogTitle>{headerContent}</DialogTitle>}
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {content}
        {!hideFooter && <DialogFooter>{footer || footerContent}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
};

export const confirmModal = ContextAwareConfirmation.createConfirmation(confirmable(ConfirmModal));
