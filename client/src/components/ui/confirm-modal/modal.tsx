import * as React from "react";
import { confirmable, ConfirmDialog } from "react-confirm";
import { useKey } from "react-use";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import type { ConfirmModalProps } from "./types";
import { useTranslation } from "react-i18next";

const ConfirmModal: ConfirmDialog<ConfirmModalProps, boolean> = ({
  show = false,
  proceed,
  title,
  description,
  children,
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
}) => {
  const [isLoading, setIsLoading] = React.useState(false);
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
      "sm:max-w-[425px]",
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
          {children}
          <AlertDialogFooter>{footerContent}</AlertDialogFooter>
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
        {children}
        <DialogFooter>{footerContent}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default confirmable(ConfirmModal);
