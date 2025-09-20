"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useMemberSearch } from "@/hooks/use-member-search";
import useWorkspaceStore from "@/stores/workspace-store";

interface SharedUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  permission: "READ" | "EDIT";
  type: "user" | "group";
  memberCount?: number;
}

interface AddMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingUsers: SharedUser[];
  onPendingUsersChange: (users: SharedUser[]) => void;
  onAddUsers: () => void;
}

export function AddMembersDialog({ open, onOpenChange, pendingUsers = [], onPendingUsersChange, onAddUsers }: AddMembersDialogProps) {
  const { t } = useTranslation();
  const [searchValue, setSearchValue] = React.useState("");
  const [notifyUsers, setNotifyUsers] = React.useState(true);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceId = currentWorkspace?.id;

  // Show dropdown when dialog opens
  React.useEffect(() => {
    if (open) {
      setShowDropdown(true);
    }
  }, [open]);

  // Use the member search hook - always enabled to show suggestions on open
  const { availableMembers, loading } = useMemberSearch({
    workspaceId,
    query: searchValue,
    enabled: open && !!workspaceId,
  });

  const addUser = (member: any) => {
    const newUser: SharedUser = {
      id: member.id,
      name: member.name,
      email: member.email,
      avatar: member.avatar,
      permission: "READ",
      type: member.type,
      memberCount: member.memberCount,
    };
    onPendingUsersChange([newUser, ...pendingUsers]);
    setSearchValue("");
    setShowDropdown(false);
  };

  const removePendingUser = (userId: string) => {
    onPendingUsersChange(pendingUsers.filter((user) => user.id !== userId));
  };

  const updatePendingPermission = (userId: string, permission: "READ" | "EDIT") => {
    onPendingUsersChange(pendingUsers.map((user) => (user.id === userId ? { ...user, permission } : user)));
  };

  const filteredUsers = React.useMemo(() => {
    if (!Array.isArray(availableMembers)) return [];
    return availableMembers.filter(
      (member) =>
        member?.id &&
        member?.name &&
        !pendingUsers.find((pending) => pending.id === member.id) &&
        (member?.name.toLowerCase().includes(searchValue.toLowerCase()) || member?.email?.toLowerCase().includes(searchValue.toLowerCase())),
    );
  }, [availableMembers, pendingUsers, searchValue]);

  if (!workspaceId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg w-full max-w-[90vw]">
          <DialogHeader>
            <DialogTitle>{t("Add people from workspace")}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground p-4">{t("No workspace selected")}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg w-full max-w-[90vw]">
        <DialogHeader>
          <DialogTitle>{t("Add people from workspace")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Input
              placeholder={t("Search users or groups...")}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              className="w-full"
            />
            {showDropdown && (searchValue || availableMembers.length > 0) && (
              <div
                className="absolute top-full left-0 right-0 z-50 max-h-48 bg-popover border rounded-md shadow-lg overflow-y-auto"
                onBlur={() => setShowDropdown(false)}
              >
                {loading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t("Loading...")}</div>
                ) : filteredUsers.length > 0 ? (
                  <div className="p-2">
                    {filteredUsers.map((member) => (
                      <div
                        key={`${member.type}-${member.id}`}
                        onClick={() => addUser(member)}
                        className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer"
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={member.avatar || ""} />
                          <AvatarFallback className="text-xs">{member.type === "group" ? "👥" : member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className=" text-sm">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                          {member.memberCount && <div className="text-xs text-muted-foreground">{t("{{count}} members", { count: member.memberCount })}</div>}
                        </div>
                        {member.type === "group" && (
                          <Badge variant="secondary" className="text-xs">
                            {t("Group")}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-muted-foreground">{t("No users found.")}</div>
                )}
              </div>
            )}
          </div>

          {/* Pending Users List */}
          {pendingUsers.length > 0 && (
            <div className="space-y-2">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {pendingUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-md border bg-card">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar || ""} />
                      <AvatarFallback className="text-sm">{user.type === "group" ? "👥" : user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className=" text-sm truncate">{user.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      {user.memberCount && <div className="text-xs text-muted-foreground">{t("{{count}} members", { count: user.memberCount })}</div>}
                    </div>
                    <Select value={user.permission} onValueChange={(value: "READ" | "EDIT") => updatePendingPermission(user.id, value)}>
                      <SelectTrigger className="w-20 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="READ">{t("View")}</SelectItem>
                        <SelectItem value="EDIT">{t("Edit")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="sm" onClick={() => removePendingUser(user.id)} className="h-8 w-8 p-0">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-3">
          <div className="flex items-center space-x-2 w-full">
            <Checkbox id="notify-dialog" checked={notifyUsers} onCheckedChange={(checked) => setNotifyUsers(checked as boolean)} />
            <Label htmlFor="notify-dialog" className="text-sm">
              {t("Notify people when sharing")}
            </Label>
          </div>
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t("Cancel")}
            </Button>
            <Button onClick={onAddUsers} disabled={pendingUsers.length === 0} className="flex-1">
              {t("Confirm Add")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
