import { useState } from "react";
import { Box } from "lucide-react";
import { Button } from '@idea/ui/shadcn/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@idea/ui/shadcn/ui/dialog';
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import { cn } from '@idea/ui/shadcn/utils';
import { useTranslation } from "react-i18next";

interface TemplateDialogProps {
  // react-confirm props
  show?: boolean;
  proceed?: (value: any) => void;
}

const TemplateDialog: React.FC<ConfirmDialogProps<TemplateDialogProps, any>> = ({ show = false, proceed }) => {
  const { t } = useTranslation();

  const handleClose = () => {
    proceed?.(null);
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            {t("Template Center")}
          </DialogTitle>
          <DialogDescription>{t("Access pre-built templates to quickly create documents")}</DialogDescription>
        </DialogHeader>

        <div className="py-8 text-center">
          <div className="mb-4">
            <Box className="h-16 w-16 mx-auto text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{t("Feature Coming Soon")}</h3>
          <p className="text-muted-foreground mb-6">{t("We're working on bringing you a comprehensive template library. Stay tuned!")}</p>
          <Button onClick={handleClose} className="w-full">
            {t("Got it")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Create the confirm modal
export const templateModal = ContextAwareConfirmation.createConfirmation(confirmable(TemplateDialog));

// Helper function to show the template modal
export const showTemplateModal = () => {
  return templateModal({});
};
