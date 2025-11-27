import { useState } from "react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Label } from "@idea/ui/shadcn/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@idea/ui/shadcn/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@idea/ui/shadcn/ui/dialog";
import { useTranslation } from "react-i18next";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import type { InvitationExpirationDuration } from "@idea/contracts";

const DURATION_OPTIONS: Array<{ value: InvitationExpirationDuration; labelKey: string }> = [
  { value: "ONE_WEEK", labelKey: "1 week" },
  { value: "ONE_MONTH", labelKey: "1 month" },
  { value: "SIX_MONTHS", labelKey: "6 months" },
  { value: "ONE_YEAR", labelKey: "1 year" },
  { value: "PERMANENT", labelKey: "Never expires" },
];

export interface ResetInviteLinkModalProps {
  // react-confirm props
  show?: boolean;
  proceed?: (value: InvitationExpirationDuration | null) => void;
}

const ResetInviteLinkModal = ({ show = false, proceed }: ConfirmDialogProps<ResetInviteLinkModalProps, InvitationExpirationDuration | null>) => {
  const [selectedDuration, setSelectedDuration] = useState<InvitationExpirationDuration>("ONE_MONTH");
  const { t } = useTranslation();

  const handleClose = () => {
    proceed?.(null);
  };

  const handleConfirm = () => {
    proceed?.(selectedDuration);
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Reset invitation link")}</DialogTitle>
          <DialogDescription>{t("This will invalidate the current link. Anyone with the old link will no longer be able to join.")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("New link expiration")}</Label>
            <Select value={selectedDuration} onValueChange={(v) => setSelectedDuration(v as InvitationExpirationDuration)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleConfirm}>{t("Reset link")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const showResetInviteLinkModal = ContextAwareConfirmation.createConfirmation(confirmable(ResetInviteLinkModal));
