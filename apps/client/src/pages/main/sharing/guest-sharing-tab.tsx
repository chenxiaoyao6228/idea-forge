"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Globe, Copy, X, Calendar, MessageSquare, Search } from "lucide-react";

interface GuestSharingTabProps {
  documentId: string;
}

interface GuestUser {
  id: string;
  email: string;
  permission: "READ" | "EDIT";
}

// Mock existing guests - in real implementation, this would come from API
const mockExistingGuests: GuestUser[] = [
  { id: "existing-1", email: "john.doe@example.com", permission: "READ" },
  { id: "existing-2", email: "jane.smith@company.com", permission: "EDIT" },
  { id: "existing-3", email: "mike.wilson@startup.io", permission: "READ" },
  { id: "existing-4", email: "sarah.johnson@design.co", permission: "EDIT" },
];

export function GuestSharingTab({ documentId }: GuestSharingTabProps) {
  const { t } = useTranslation();
  const [guestUsers, setGuestUsers] = React.useState<GuestUser[]>([]);
  const [publicSharingEnabled, setPublicSharingEnabled] = React.useState(false);
  const [allowComments, setAllowComments] = React.useState(true);
  const [expireTime, setExpireTime] = React.useState("never");
  const [addGuestDialogOpen, setAddGuestDialogOpen] = React.useState(false);
  const [newGuestEmail, setNewGuestEmail] = React.useState("");
  const [existingGuestsFilter, setExistingGuestsFilter] = React.useState("");

  const filteredExistingGuests = mockExistingGuests.filter(
    (guest) => guest.email.toLowerCase().includes(existingGuestsFilter.toLowerCase()) && !guestUsers.some((addedGuest) => addedGuest.email === guest.email),
  );

  const addGuest = async () => {
    if (!newGuestEmail.trim()) return;

    const newGuest: GuestUser = {
      id: Date.now().toString(),
      email: newGuestEmail.trim(),
      permission: "READ",
    };

    setGuestUsers((prev) => [...prev, newGuest]);
    setNewGuestEmail("");
    setAddGuestDialogOpen(false);

    // TODO: Implement actual guest invitation API call
    toast.success(t("Invitation sent to {{email}}", { email: newGuest.email }));
  };

  const addExistingGuest = (guest: GuestUser) => {
    const newGuest: GuestUser = {
      ...guest,
      id: Date.now().toString(),
    };

    setGuestUsers((prev) => [...prev, newGuest]);
    toast.success(t("{{email}} added to collaborators", { email: guest.email }));
  };

  const removeGuest = (guestId: string) => {
    setGuestUsers((prev) => prev.filter((guest) => guest.id !== guestId));
  };

  const updateGuestPermission = (guestId: string, permission: "READ" | "EDIT") => {
    setGuestUsers((prev) => prev.map((guest) => (guest.id === guestId ? { ...guest, permission } : guest)));
  };

  const copyPublicLink = () => {
    // TODO: Implement actual public link generation and copying
    navigator.clipboard.writeText("https://app.example.com/public/abc123");
    toast.success(t("Public link copied to clipboard"));
  };

  const handleShareGuests = async () => {
    try {
      // TODO: Implement actual guest sharing API call
      if (guestUsers.length > 0) {
        toast.success(t("Guests invited successfully"));
        setGuestUsers([]);
      }
    } catch (error) {
      toast.error(t("Failed to invite guests"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Guest Collaborators Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm  flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            {t("Guest collaborators")}
          </Label>
          <Dialog open={addGuestDialogOpen} onOpenChange={setAddGuestDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {t("Add guest")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("Invite collaborators")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="email"
                      placeholder={t("Enter email address")}
                      value={newGuestEmail}
                      onChange={(e) => setNewGuestEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addGuest()}
                      className="flex-1"
                    />
                    <Select defaultValue="READ">
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="READ">{t("View")}</SelectItem>
                        <SelectItem value="EDIT">{t("Edit")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={addGuest} disabled={!newGuestEmail.trim()} className="bg-rose-400 hover:bg-rose-500">
                      {t("Invite")}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm ">{t("Existing workspace guests")}</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("Search by email")}
                      value={existingGuestsFilter}
                      onChange={(e) => setExistingGuestsFilter(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {filteredExistingGuests.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {filteredExistingGuests.map((guest) => (
                        <div
                          key={guest.id}
                          className="flex items-center gap-3 p-2 rounded-md border bg-card hover:bg-accent cursor-pointer"
                          onClick={() => addExistingGuest(guest)}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">{guest.email.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className=" text-sm truncate">{guest.email}</div>
                            <div className="text-xs text-muted-foreground">{t("Workspace guest")}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">{guest.permission}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      {existingGuestsFilter ? t("No matching guests found") : t("No existing guests")}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setAddGuestDialogOpen(false)}>
                    {t("Cancel")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {guestUsers.length > 0 ? (
          <div className="space-y-2">
            {guestUsers.map((guest) => (
              <div key={guest.id} className="flex items-center gap-3 p-2 rounded-md border bg-card">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-sm">{guest.email.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className=" text-sm truncate">{guest.email}</div>
                  <div className="text-xs text-muted-foreground">{t("Guest")}</div>
                </div>
                <Select value={guest.permission} onValueChange={(value: "READ" | "EDIT") => updateGuestPermission(guest.id, value)}>
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="READ">{t("View")}</SelectItem>
                    <SelectItem value="EDIT">{t("Edit")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeGuest(guest.id)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">{t("No guest collaborators yet")}</div>
        )}

        {guestUsers.length > 0 && (
          <div className="flex justify-end">
            <Button onClick={handleShareGuests} className="w-full">
              {t("Share with guests")}
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Public Sharing Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <Label className="text-sm ">{t("Public sharing")}</Label>
          </div>
          <Switch checked={publicSharingEnabled} onCheckedChange={setPublicSharingEnabled} />
        </div>

        {publicSharingEnabled && (
          <div className="space-y-4">
            {/* Expire Time */}
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t("Expire time")}
              </Label>
              <Select value={expireTime} onValueChange={setExpireTime}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">{t("Never")}</SelectItem>
                  <SelectItem value="1hour">{t("1 hour")}</SelectItem>
                  <SelectItem value="1day">{t("1 day")}</SelectItem>
                  <SelectItem value="1week">{t("1 week")}</SelectItem>
                  <SelectItem value="1month">{t("1 month")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Allow Comments */}
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t("Allow comments")}
              </Label>
              <Switch checked={allowComments} onCheckedChange={setAllowComments} />
            </div>

            {/* Copy Public Link */}
            <Button variant="outline" className="w-full justify-start gap-2 bg-transparent" onClick={copyPublicLink}>
              <Copy className="h-4 w-4" />
              {t("Copy public link")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
