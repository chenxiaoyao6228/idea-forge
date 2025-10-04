import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PermissionLevel } from "@idea/contracts";
import { PermissionLevelSelector } from "@/components/ui/permission-level-selector";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";

interface RequestPermissionModalProps {
  // react-confirm props
  show?: boolean;
  proceed?: (value: any) => void;

  // custom props
  currentPermission: PermissionLevel;
  onSubmit: (requestedPermission: PermissionLevel, reason: string) => Promise<void>;
}

const RequestPermissionModal = ({
  show = false,
  proceed,
  currentPermission,
  onSubmit,
}: ConfirmDialogProps<RequestPermissionModalProps, boolean>) => {
  const { t } = useTranslation();
  const [requestedPermission, setRequestedPermission] = useState<PermissionLevel>(currentPermission);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(requestedPermission, reason);
      setReason("");
      proceed?.(true);
    } catch (error) {
      console.error("Failed to submit permission request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    proceed?.(false);
  };

  const getPermissionLevelText = (level: string) => {
    switch (level) {
      case "MANAGE":
        return t("Manage");
      case "EDIT":
        return t("Edit");
      case "COMMENT":
        return t("Comment");
      case "READ":
        return t("View");
      case "NONE":
        return t("No Access");
      default:
        return level;
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("Request Permission Change")}</DialogTitle>
          <DialogDescription>
            {t("Request a higher permission level for this document. An administrator will review your request.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("Current Permission")}</Label>
            <div className="text-sm text-muted-foreground">
              {getPermissionLevelText(currentPermission)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requested-permission">{t("Requested Permission")}</Label>
            <PermissionLevelSelector
              id="requested-permission"
              value={requestedPermission}
              onChange={(value) => setRequestedPermission(value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{t("Reason for Request")} *</Label>
            <Textarea
              id="reason"
              placeholder={t("Please explain why you need this permission level...")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim() || requestedPermission === currentPermission}
          >
            {isSubmitting ? t("Submitting...") : t("Submit Request")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const showRequestPermissionModal = ContextAwareConfirmation.createConfirmation(confirmable(RequestPermissionModal));
