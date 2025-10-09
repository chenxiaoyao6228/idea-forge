import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PermissionLevelSelector } from "@/components/ui/permission-level-selector";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Link, Info } from "lucide-react";
import { showAddGuestModal } from "./add-guest-dialog";
import useGuestCollaboratorsStore, {
  useFetchDocumentGuests,
  useUpdateGuestPermission,
  useRemoveGuestFromDocument,
  useIsGuestCollaborator,
} from "@/stores/guest-collaborators-store";
import { PermissionLevel } from "@idea/contracts";
import { toast } from "sonner";
import useUserStore from "@/stores/user-store";

interface GuestSharingTabProps {
  documentId: string;
}

// Helper function to get operation text based on permission level
// Note: Permission labels are also defined in permission-level-selector.tsx
// Keep these in sync or consider extracting to a shared hook if more components need this
function getOperationText(permission: PermissionLevel, t: (key: string) => string): string {
  switch (permission) {
    case PermissionLevel.MANAGE:
      return t("manage");
    case PermissionLevel.EDIT:
      return t("edit");
    case PermissionLevel.COMMENT:
      return t("comment on");
    case PermissionLevel.READ:
      return t("view");
    case PermissionLevel.NONE:
      return t("no access to");
    default:
      return t("view");
  }
}

export function GuestSharingTab({ documentId }: GuestSharingTabProps) {
  const { t } = useTranslation();
  const isGuestCollaborator = useIsGuestCollaborator();
  const currentUserEmail = useUserStore((s) => s.userInfo?.email);

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
            <Button variant="outline" size="sm" onClick={() => showAddGuestModal({ documentId })} disabled={isGuestCollaborator}>
              <Plus className="h-4 w-4 mr-1" />
              {t("Add guests")}
            </Button>
          </div>
        </div>

        {/* Document Guests */}
        {isLoadingGuests ? (
          <div className="text-center py-6 text-muted-foreground text-sm">{t("Loading guests...")}</div>
        ) : existingGuests && existingGuests.length > 0 ? (
          <div className="space-y-2">
            {existingGuests.map((guest) => {
              // Use the guest's effective permission (API already resolved inheritance)
              const currentPermission = guest.permission || PermissionLevel.READ;
              const isInherited = guest.isInherited || false;
              const hasParentPermission = guest.hasParentPermission || false;
              const isDirect = guest.permissionSource?.source === "direct";
              const isCurrentUser = guest.email === currentUserEmail;

              // Show "Restore Inherited" when guest has DIRECT permission that overrides parent
              // Show "Remove" only when guest has DIRECT permission but NO parent permission to fall back to
              const showRestoreInherited = hasParentPermission && isDirect;
              const showRemove = isDirect && !hasParentPermission;

              // Build tooltip text based on permission state
              let tooltipText = "";
              if (showRestoreInherited && guest.parentPermissionSource) {
                // Override case
                tooltipText = t(
                  `Permission overridden from parent document "${guest.parentPermissionSource.sourceDocTitle}" inherited permission. To restore inherited permission, select 'Restore Inherited' from dropdown`,
                );
              } else if (isDirect) {
                // Direct only
                tooltipText = t("Direct permission granted on this document");
              } else if (isInherited && guest.permissionSource) {
                // Inherited only
                tooltipText = t(
                  `Inherited from parent document: "${guest.permissionSource.sourceDocTitle}". If need to change the permission setting, you can overwrite`,
                );
              }

              const operationText = getOperationText(currentPermission, t);

              // If current user is a guest, show read-only view for ALL guests
              if (isGuestCollaborator) {
                return (
                  <div key={guest.id} className="flex items-center gap-3 p-2 rounded-md border bg-card">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-sm">{guest.email.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{guest.name || guest.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {isCurrentUser
                          ? t("You can {{operation}} this page", { operation: operationText })
                          : t("Can {{operation}} this page", { operation: operationText })}
                      </div>
                    </div>
                  </div>
                );
              }

              // Admin/member view - show permission controls
              return (
                <TooltipProvider key={guest.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between gap-3 p-2 rounded-md border bg-card">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">{guest.email.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-grow-1 min-w-0">
                            <div className="text-sm truncate flex items-center gap-1">
                              {guest.name || guest.email}
                              {tooltipText && <Info className="h-3 w-3 text-blue-500" />}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("Status")}: {guest.status}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <PermissionLevelSelector
                            value={currentPermission}
                            onChange={(value: PermissionLevel) => updateGuestPermission(guest.id, value)}
                            className="h-8 text-xs"
                            showRestoreInherited={showRestoreInherited}
                            onRestoreInherited={() => handleRemoveGuest(guest.id)}
                            showRemove={showRemove}
                            onRemove={() => handleRemoveGuest(guest.id)}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    {tooltipText && (
                      <TooltipContent className="max-w-[300px]">
                        <p className="text-xs whitespace-normal">{tooltipText}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
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
