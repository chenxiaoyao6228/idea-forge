import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@idea/ui/shadcn/ui/dialog';
import { Button } from '@idea/ui/shadcn/ui/button';
import { Label } from '@idea/ui/shadcn/ui/label';
import { Textarea } from '@idea/ui/shadcn/ui/textarea';
import { PermissionLevel } from "@idea/contracts";
import { PermissionLevelSelector } from '@/components/ui/permission-level-selector';
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";

// Permission level hierarchy from lowest to highest
const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  NONE: 0,
  READ: 1,
  COMMENT: 2,
  EDIT: 3,
  MANAGE: 4,
};

const getHigherPermissionLevels = (currentLevel: PermissionLevel): PermissionLevel[] => {
  const currentIndex = PERMISSION_HIERARCHY[currentLevel];
  return Object.entries(PERMISSION_HIERARCHY)
    .filter(([, index]) => index > currentIndex)
    .map(([level]) => level as PermissionLevel);
};

const getNextHigherLevel = (currentLevel: PermissionLevel): PermissionLevel | null => {
  const currentIndex = PERMISSION_HIERARCHY[currentLevel];
  const nextLevelEntry = Object.entries(PERMISSION_HIERARCHY).find(([, index]) => index === currentIndex + 1);
  return nextLevelEntry ? (nextLevelEntry[0] as PermissionLevel) : null;
};

interface RequestPermissionModalProps {
  // react-confirm props
  show?: boolean;
  proceed?: (value: any) => void;

  // custom props
  currentPermission: PermissionLevel;
  onSubmit: (requestedPermission: PermissionLevel, reason: string) => Promise<void>;
}

const RequestPermissionModal = ({ show = false, proceed, currentPermission, onSubmit }: ConfirmDialogProps<RequestPermissionModalProps, boolean>) => {
  const { t } = useTranslation();

  // Get the next higher level as default, or null if no higher level exists
  const nextHigherLevel = getNextHigherLevel(currentPermission);

  // Get available higher levels
  const availableHigherLevels = getHigherPermissionLevels(currentPermission);

  // Initialize with next higher level if available, otherwise use current permission
  const [requestedPermission, setRequestedPermission] = useState<PermissionLevel>(nextHigherLevel || currentPermission);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return;
    }

    // Validate that requested permission is higher than current permission
    const currentIndex = PERMISSION_HIERARCHY[currentPermission];
    const requestedIndex = PERMISSION_HIERARCHY[requestedPermission];

    if (requestedIndex <= currentIndex) {
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

  // If user already has the highest permission level, show different message
  if (availableHigherLevels.length === 0) {
    return (
      <Dialog open={show} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("Permission Request")}</DialogTitle>
            <DialogDescription>
              {t("You already have the highest permission level (Manage) for this document. No higher permissions are available.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              {t("Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("Request Permission Change")}</DialogTitle>
          <DialogDescription>{t("Request a higher permission level for this document. An administrator will review your request.")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t("Current Permission")}</Label>
            <div className="text-sm text-muted-foreground">{getPermissionLevelText(currentPermission)}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requested-permission">{t("Requested Permission")}</Label>
            <PermissionLevelSelector
              id="requested-permission"
              value={requestedPermission}
              onChange={(value) => setRequestedPermission(value)}
              className="w-full"
              availableLevels={getHigherPermissionLevels(currentPermission)}
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
            disabled={isSubmitting || !reason.trim() || PERMISSION_HIERARCHY[requestedPermission] <= PERMISSION_HIERARCHY[currentPermission]}
          >
            {isSubmitting ? t("Submitting...") : t("Submit Request")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const showRequestPermissionModal = ContextAwareConfirmation.createConfirmation(confirmable(RequestPermissionModal));
