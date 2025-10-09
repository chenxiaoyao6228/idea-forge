import { useEffect, useState, useMemo } from "react";
import { useOrderedGuests, useFetchGuests, useUpdateGuestPermission, useRemoveGuestFromDocument, useRemoveGuest, usePromoteGuest } from "@/stores/guest-collaborators-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Search, Plus, Users } from "lucide-react";
import { GuestCard } from "./guest-card";
import { showInviteGuestDialog } from "./invite-guest-dialog";
import useWorkspaceStore from "@/stores/workspace-store";
import type { GuestCollaboratorResponse } from "@idea/contracts";

export const GuestCollaboratorPanel = () => {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const orderedGuests = useOrderedGuests();
  const { run: fetchGuests } = useFetchGuests();
  const { run: updateGuestPermission } = useUpdateGuestPermission();
  const { run: removeGuestFromDocument } = useRemoveGuestFromDocument();
  const removeGuest = useRemoveGuest();
  const promoteGuest = usePromoteGuest();
  const [search, setSearch] = useState("");

  const handleInviteGuest = () => {
    if (!currentWorkspace?.id) return;

    showInviteGuestDialog({
      workspaceId: currentWorkspace.id,
      onSuccess: () => {
        fetchGuests();
      },
    });
  };

  useEffect(() => {
    // Force fresh fetch for workspace-level management view with explicit pagination
    fetchGuests();
  }, []);

  const guests = useMemo(() => {
    return orderedGuests.filter((guest: GuestCollaboratorResponse) => {
      const searchTerm = search.trim().toLowerCase();
      if (!searchTerm) return true;
      return (
        guest.email.toLowerCase().includes(searchTerm) ||
        guest.name?.toLowerCase().includes(searchTerm)
      );
    });
  }, [orderedGuests, search]);

  const handleUpdatePermission = async (guestId: string, documentId: string, permission: string) => {
    await updateGuestPermission({
      guestId,
      documentId,
      permission: permission as any,
    });
  };

  const handleRemoveDocumentAccess = (guestId: string, documentId: string, documentTitle: string) => {
    removeGuestFromDocument({
      guestId,
      documentId,
      documentTitle,
    });
  };

  const handleRemoveGuest = (guestId: string, guestName: string) => {
    removeGuest(guestId, guestName);
  };

  const handlePromoteGuest = (guestId: string, guestName: string) => {
    promoteGuest(guestId, guestName);
  };

  return (
    <div className="space-y-6">
      {/* Header with search and add button */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input placeholder={t("Search guests...")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" aria-label="Search guests" />
        </div>
        <Button onClick={handleInviteGuest} className="bg-black hover:bg-gray-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          {t("Invite Guest")}
        </Button>
      </div>

      {/* Guests grid */}
      <div className="grid gap-4 grid-cols-1">
        {guests.map((guest: GuestCollaboratorResponse) => (
          <GuestCard
            key={guest.id}
            guest={guest}
            onUpdatePermission={handleUpdatePermission}
            onRemoveDocumentAccess={handleRemoveDocumentAccess}
            onRemoveGuest={handleRemoveGuest}
            onPromoteGuest={handlePromoteGuest}
          />
        ))}
      </div>

      {/* Empty state */}
      {guests.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-black">{t("No guests found")}</h3>
          <p className="text-muted-foreground mb-4">{search ? t("Try adjusting your search terms") : t("Invite your first guest to get started")}</p>
          {!search && (
            <Button onClick={handleInviteGuest} className="bg-black hover:bg-gray-800 text-white">
              <Plus className="h-4 w-4 mr-2" />
              {t("Invite Guest")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default GuestCollaboratorPanel;
