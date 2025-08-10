import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { X, Users, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { subspaceApi } from "@/apis/subspace";
import useWorkspaceStore from "@/stores/workspace";
import useGroupStore from "@/stores/group";
import useSubSpaceStore from "@/stores/subspace";

interface AddSubspaceMemberDialogProps {
  subspaceId: string;
  subspaceName: string;
  workspaceId: string;
  children: React.ReactNode;
  onSuccess?: () => void;
}

interface SubspaceUser {
  id: string;
  email: string;
  displayName: string | null;
  imageUrl: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
}

interface SelectedItem {
  id: string;
  name: string;
  type: "user" | "group";
  avatar?: string;
}

export function AddSubspaceMemberDialog({ subspaceId, subspaceName, workspaceId, children, onSuccess }: AddSubspaceMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<"MEMBER" | "ADMIN">("MEMBER");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<SubspaceUser[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const { t } = useTranslation();

  // Get store methods
  const fetchWorkspaceMembers = useWorkspaceStore((state) => state.fetchWorkspaceMembers);
  const fetchSubspace = useSubSpaceStore((state) => state.fetchSubspace);
  const fetchWorkspaceGroups = useGroupStore((state) => state.fetchWorkspaceGroups);

  // Fetch users and groups from stores when dialog opens
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          // Fetch workspace users and groups using stores
          const [usersData, groupsData] = await Promise.all([fetchWorkspaceMembers(workspaceId), fetchWorkspaceGroups(workspaceId)]);

          // Transform workspace members to SubspaceUser format
          const transformedUsers: SubspaceUser[] = usersData.map((member: any) => ({
            id: member.user.id,
            email: member.user.email,
            displayName: member.user.displayName,
            imageUrl: member.user.imageUrl,
          }));

          // Transform groups to Group format
          const transformedGroups: Group[] = groupsData.map((group: any) => ({
            id: group.id,
            name: group.name,
            description: group.description,
            memberCount: group.members?.length || 0,
          }));

          setUsers(transformedUsers);
          setGroups(transformedGroups);
        } catch (error) {
          console.error("Failed to fetch users and groups:", error);
          toast.error("Failed to load users and groups");
        }
      };

      fetchData();
    }
  }, [open, workspaceId, fetchWorkspaceMembers, fetchWorkspaceGroups]);

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when dialog closes
      setSearchQuery("");
      setSelectedItems([]);
      setSelectedRole("MEMBER");
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      !selectedItems.some((item) => item.id === user.id && item.type === "user") &&
      (user.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || user.email.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const filteredGroups = groups.filter(
    (group) => !selectedItems.some((item) => item.id === group.id && item.type === "group") && group.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelectUser = (user: SubspaceUser) => {
    setSelectedItems((prev) => [
      ...prev,
      {
        id: user.id,
        name: user.displayName || user.email,
        type: "user" as const,
        avatar: user.imageUrl || undefined,
      },
    ]);
    setSearchQuery("");
  };

  const handleSelectGroup = (group: Group) => {
    setSelectedItems((prev) => [
      ...prev,
      {
        id: group.id,
        name: group.name,
        type: "group" as const,
      },
    ]);
    setSearchQuery("");
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error(t("Please select at least one member or group"));
      return;
    }

    setLoading(true);
    try {
      const response = await subspaceApi.batchAddSubspaceMembers(subspaceId, {
        items: selectedItems.map((item) => ({
          id: item.id,
          type: item.type,
          role: selectedRole,
        })),
      });

      if (response.success) {
        if (response.addedCount > 0) {
          toast.success(t("Successfully added {{count}} member(s)", { count: response.addedCount }));
        }

        if (response.errors && response.errors.length > 0) {
          const errorMessages = response.errors.map((error) => `${error.type === "user" ? "User" : "Group"} ${error.id}: ${error.error}`).join(", ");
          toast.error(t("Some items failed to add: {{errors}}", { errors: errorMessages }));
        }

        await fetchSubspace(subspaceId);

        // Close dialog and call onSuccess
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(t("Failed to add members"));
      }
    } catch (error) {
      console.error("Error adding members:", error);
      toast.error(t("Failed to add members"));
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("Invite people to")} {subspaceName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search">{t("Select member or member group")}</Label>
            <Input id="search" placeholder={t("Select member or member group")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>{t("Role")}</Label>
            <Select value={selectedRole} onValueChange={(value: "MEMBER" | "ADMIN") => setSelectedRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">{t("Admin")}</SelectItem>
                <SelectItem value="MEMBER">{t("Member")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="space-y-2">
              <Label>{t("Selected")}</Label>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item) => (
                  <Badge key={item.id} variant="secondary" className="flex items-center space-x-1">
                    {item.type === "user" ? <User className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                    <span>{item.name}</span>
                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveItem(item.id)} />
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {(filteredUsers.length > 0 || filteredGroups.length > 0) && searchQuery && (
            <div className="space-y-2">
              <Label>{t("Search Results")}</Label>
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                  {/* Users */}
                  {filteredUsers.length > 0 && (
                    <>
                      <div className="text-sm font-medium text-muted-foreground">{t("Members")}</div>
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => handleSelectUser(user)}
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs bg-red-500 text-white">{getInitials(user.displayName || user.email)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{user.displayName || user.email}</span>
                        </div>
                      ))}
                    </>
                  )}

                  {/* Groups */}
                  {filteredGroups.length > 0 && (
                    <>
                      {filteredUsers.length > 0 && <Separator />}
                      <div className="text-sm font-medium text-muted-foreground">{t("Member Groups")}</div>
                      {filteredGroups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => handleSelectGroup(group)}
                        >
                          <div className="h-6 w-6 rounded bg-gray-500 flex items-center justify-center">
                            <span className="text-xs text-white">{getInitials(group.name)}</span>
                          </div>
                          <span className="text-sm">{group.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({group.memberCount} {t("members")})
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={selectedItems.length === 0 || loading}>
              {loading ? t("Adding...") : t("Add Members")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
