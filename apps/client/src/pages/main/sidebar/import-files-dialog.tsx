import React from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@idea/ui/shadcn/ui/dialog';
import { Upload } from "lucide-react";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";

interface ImportFilesDialogProps {
  show?: boolean;
  proceed?: (value: any) => void;
}

const ImportFilesDialog: React.FC<ConfirmDialogProps<ImportFilesDialogProps, any>> = ({ show = false, proceed }) => {
  const { t } = useTranslation();

  const handleClose = () => {
    proceed?.(null);
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("Import Files")}
          </DialogTitle>
          <DialogDescription>{t("This feature is coming soon!")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-muted-foreground">
          <Upload className="h-12 w-12" />
          <p className="text-center">{t("Import documents from your device")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const importFilesModal = ContextAwareConfirmation.createConfirmation(confirmable(ImportFilesDialog));

export const showImportFilesModal = () => {
  return importFilesModal({});
};
