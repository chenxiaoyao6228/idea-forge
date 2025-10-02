import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PermissionLevelSelector } from "@/components/ui/permission-level-selector";
import { Separator } from "@/components/ui/separator";
import { UserPlus, X, Plus, Link } from "lucide-react";
import { showAddGuestModal } from "./add-guest-dialog";
import { PublicSharingSection } from "./public-sharing-section";
import useGuestCollaboratorsStore, {
  useFetchDocumentGuests,
  useUpdateGuestPermission,
  useRemoveGuestFromDocument,
  useIsGuestCollaborator,
} from "@/stores/guest-collaborators-store";
import { PermissionLevel } from "@idea/contracts";
import { toast } from "sonner";

interface GuestSharingTabProps {
  documentId: string;
}

export function GuestSharingTab({ documentId }: GuestSharingTabProps) {
  const { t } = useTranslation();

  // Get existing guests from store
  const existingGuests = useGuestCollaboratorsStore((state) => state.guests);
  const { run: fetchDocumentGuests, loading: isLoadingGuests } = useFetchDocumentGuests();
  const { run: updateGuestPermissionHook } = useUpdateGuestPermission();
  const { run: removeGuestFromDocument } = useRemoveGuestFromDocument();

  const handleRemoveGuest = (guestId: string) => {
    removeGuestFromDocument({ guestId, documentId });
  };

  const updateGuestPermission = async (guestId: string, permission: PermissionLevel) => {
    await updateGuestPermissionHook({ guestId, permission, documentId });
  };

  const copyPageAccessLink = () => {
    // Copy the current page URL from the browser address bar
    navigator.clipboard.writeText(window.location.href);
    toast.success(t("Link copied to clipboard"));
  };

  // Fetch document-specific guests when component mounts
  useEffect(() => {
    if (documentId) {
      fetchDocumentGuests(documentId);
    }
  }, [documentId, fetchDocumentGuests]);

  return (
    <div className="space-y-6">
      {/* Guest Collaborators Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm  flex items-center gap-2">{t("Guest collaborators")}</Label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => showAddGuestModal({ documentId })}>
              <Plus className="h-4 w-4 mr-1" />
              {t("Add guests")}
            </Button>
          </div>
        </div>

        {/* Document Guests */}
        {isLoadingGuests ? (
          <div className="text-center py-6 text-muted-foreground text-sm">{t("Loading guests...")}</div>
        ) : existingGuests?.filter((guest) => guest.documents?.some((doc) => doc.documentId === documentId)).length > 0 ? (
          <div className="space-y-2">
            {existingGuests
              ?.filter((guest) => guest.documents?.some((doc) => doc.documentId === documentId))
              .map((guest) => {
                // Find the document-specific permission for this guest
                const documentPermission = guest.documents?.find((doc) => doc.documentId === documentId);
                const currentPermission = documentPermission?.permission || PermissionLevel.READ;

                return (
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
                        value={currentPermission}
                        onChange={(value: PermissionLevel) => updateGuestPermission(guest.id, value)}
                        className="h-8 text-xs"
                      />
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveGuest(guest.id)} className="h-8 w-8 p-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">{t("No guest collaborators yet")}</div>
        )}
      </div>

      {/* <Separator /> */}

      {/* Public Sharing Section */}
      {/* <PublicSharingSection /> */}

      <Separator />
      <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md transition-colors" onClick={copyPageAccessLink}>
        <div className="text-sm  flex items-center gap-2 p-1 cursor-pointer">
          <Link className="h-4 w-4" />
          {t("Copy page access link")}
        </div>
      </div>
    </div>
  );
}
