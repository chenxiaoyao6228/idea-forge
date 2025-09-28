import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import { PermissionLevel } from "@idea/contracts";
import useGuestCollaboratorsStore, { useFetchGuests, useInviteGuest, useBatchInviteGuests } from "@/stores/guest-collaborators-store";
import useWorkspaceStore from "@/stores/workspace-store";
import { PermissionLevelSelector } from "@/components/ui/permission-level-selector";

export interface PendingGuest {
  id: string;
  email: string;
  name: string | null;
  permission: PermissionLevel;
  status: "PENDING" | "ACTIVE" | "REVOKED" | "EXPIRED";
  expireAt: Date;
}

interface AddGuestDialogProps {
  // react-confirm props
  show?: boolean;
  proceed?: (value: any) => void;
  documentId: string;
}

const AddGuestDialog = ({ show = false, proceed, documentId }: ConfirmDialogProps<AddGuestDialogProps, boolean>) => {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = React.useState("");
  const [notifyGuests, setNotifyGuests] = React.useState(true);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [pendingGuests, setPendingGuests] = React.useState<PendingGuest[]>([]);
  const [newGuestEmail, setNewGuestEmail] = React.useState("");
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceId = currentWorkspace?.id;

  // Get existing guests from store
  const existingGuests = useGuestCollaboratorsStore((state) => state.guests);
  const { run: fetchGuests } = useFetchGuests();
  const { run: inviteGuest } = useInviteGuest();
  const { run: batchInviteGuests } = useBatchInviteGuests();

  // Show dropdown when component mounts
  useEffect(() => {
    if (show && workspaceId) {
      setShowDropdown(true);
      fetchGuests();
    }
  }, [show, workspaceId, fetchGuests]);

  const addGuest = (guest: any) => {
    const newGuest: PendingGuest = {
      id: guest.id,
      email: guest.email,
      name: guest.name,
      permission: PermissionLevel.READ,
      status: guest.status,
      expireAt: guest.expireAt,
    };
    setPendingGuests([newGuest, ...pendingGuests]);
    setSearchValue("");
    setShowDropdown(false);
  };

  const removePendingGuest = (guestId: string) => {
    setPendingGuests(pendingGuests.filter((guest) => guest.id !== guestId));
  };

  const updatePendingPermission = (guestId: string, permission: PermissionLevel) => {
    setPendingGuests(pendingGuests.map((guest) => (guest.id === guestId ? { ...guest, permission } : guest)));
  };

  const inviteNewGuest = async () => {
    if (!newGuestEmail.trim() || !workspaceId) return;

    const emailToInvite = newGuestEmail.trim();

    try {
      await inviteGuest({
        email: emailToInvite,
        permission: PermissionLevel.READ,
        documentId,
      });
      setNewGuestEmail("");
      toast.success(t("Invitation sent to {{email}}", { email: emailToInvite }));
    } catch (error) {
      console.error("Failed to invite guest:", error);
      toast.error(t("Failed to invite guest"));
    }
  };

  const filteredGuests = React.useMemo(() => {
    if (!Array.isArray(existingGuests)) return [];
    return existingGuests.filter(
      (guest) =>
        guest?.id &&
        guest?.email &&
        !pendingGuests.find((pending) => pending.id === guest.id) &&
        (guest?.email.toLowerCase().includes(searchValue.toLowerCase()) || guest?.name?.toLowerCase().includes(searchValue.toLowerCase())),
    );
  }, [existingGuests, pendingGuests, searchValue]);

  const handleConfirm = async () => {
    if (pendingGuests.length > 0) {
      try {
        // Batch add all pending guests to the document
        await batchInviteGuests({
          documentId,
          guests: pendingGuests.map((guest) => ({
            guestId: guest.id,
            permission: guest.permission,
          })),
        });
        proceed?.(true);
      } catch (error) {
        console.error("Failed to add guests to document:", error);
        // Still proceed to close dialog, but show error
        proceed?.(false);
      }
    } else {
      proceed?.(true);
    }
  };

  const handleCancel = () => {
    proceed?.(false);
  };

  if (!workspaceId) {
    return (
      <Dialog open={show} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-lg w-full max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{t("Add guest collaborators")}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground p-4">{t("No workspace selected")}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-lg w-full max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>{t("Add guest collaborators")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Invite New Guest Section */}
          <div className="space-y-3">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder={t("Enter email address")}
                  value={newGuestEmail}
                  onChange={(e) => setNewGuestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && inviteNewGuest()}
                  className="flex-1"
                />
                <Button onClick={inviteNewGuest} disabled={!newGuestEmail.trim()}>
                  {t("Invite")}
                </Button>
              </div>
            </div>
          </div>

          <div className="relative">
            <Input
              placeholder={t("Search existing guests...")}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              className="w-full"
            />
            {showDropdown && (searchValue || existingGuests.length > 0) && (
              <div
                className="absolute top-full left-0 right-0 z-50 max-h-48 bg-popover border rounded-md shadow-lg overflow-y-auto"
                onBlur={() => setShowDropdown(false)}
              >
                {filteredGuests.length > 0 ? (
                  <div className="p-2">
                    {filteredGuests.map((guest) => (
                      <div key={guest.id} onClick={() => addGuest(guest)} className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs">{guest.email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{guest.name || guest.email}</div>
                          <div className="text-xs text-muted-foreground">{guest.email}</div>
                          <div className="text-xs text-muted-foreground">
                            {t("Status")}: {guest.status}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {t("Guest")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t("No guests found.")}</div>
                )}
              </div>
            )}
          </div>

          {/* Pending Guests List */}
          {pendingGuests.length > 0 && (
            <div className="space-y-2">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingGuests.map((guest) => (
                  <div key={guest.id} className="flex items-center justify-between gap-3 p-2 rounded-md border bg-card">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm">{guest.email.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-grow-1 min-w-0">
                        <div className="text-sm truncate">{guest.name || guest.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {t("Status")}: {guest.status}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <PermissionLevelSelector
                        value={guest.permission}
                        onChange={(value: PermissionLevel) => updatePendingPermission(guest.id, value)}
                        className="h-8 text-xs"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removePendingGuest(guest.id)} className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-3">
          <div className="flex items-center space-x-2 w-full">
            <Checkbox id="notify-guests" checked={notifyGuests} onCheckedChange={(checked) => setNotifyGuests(checked as boolean)} />
            <Label htmlFor="notify-guests" className="text-sm">
              {t("Notify guests when sharing")}
            </Label>
          </div>
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              {t("Cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={pendingGuests.length === 0} className="flex-1">
              {t("Confirm Add")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const showAddGuestModal = ContextAwareConfirmation.createConfirmation(confirmable(AddGuestDialog));
