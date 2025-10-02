import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import { useInviteGuestToWorkspace } from "@/stores/guest-collaborators-store";
import useWorkspaceStore from "@/stores/workspace-store";

interface InviteGuestDialogProps {
  show?: boolean;
  proceed?: (value: any) => void;
  workspaceId: string;
  onSuccess?: () => void;
}

const InviteGuestDialog = ({ show = false, proceed, workspaceId, onSuccess }: ConfirmDialogProps<InviteGuestDialogProps, boolean>) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const { run: inviteGuest, loading } = useInviteGuestToWorkspace();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleConfirm = async () => {
    if (!email.trim() || !isValidEmail(email)) {
      return;
    }

    try {
      await inviteGuest({
        workspaceId,
        email: email.trim(),
        name: name.trim() || undefined,
      });

      onSuccess?.();
      proceed?.(true);
    } catch (error) {
      console.error("Failed to invite guest:", error);
      // Toast already shown in store hook
    }
  };

  const handleCancel = () => {
    proceed?.(false);
  };

  const isFormValid = email.trim() && isValidEmail(email);

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Invite Guest to Workspace")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("Email")} *</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("Enter guest email address")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isFormValid && !loading && handleConfirm()}
              autoFocus
            />
            {email && !isValidEmail(email) && <p className="text-xs text-red-500">{t("Please enter a valid email address")}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">
              {t("Name")} ({t("Optional")})
            </Label>
            <Input
              id="name"
              type="text"
              placeholder={t("Enter guest name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && isFormValid && !loading && handleConfirm()}
            />
          </div>

          <div className="text-xs text-muted-foreground">
            {t("The guest will receive an invitation and can access the workspace without document permissions until granted.")}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            {t("Cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!isFormValid || loading}>
            {loading ? t("Inviting...") : t("Invite Guest")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const showInviteGuestDialog = ContextAwareConfirmation.createConfirmation(confirmable(InviteGuestDialog));
