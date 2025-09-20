"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Link, X, Plus } from "lucide-react";
import { documentApi } from "@/apis/document";
import useWorkspaceStore from "@/stores/workspace-store";
import { AddMembersDialog } from "./add-members-dialog";

interface MemberSharingTabProps {
  documentId: string;
}

interface SharedUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  permission: "READ" | "EDIT";
  type: "user" | "group";
  memberCount?: number;
}

export function MemberSharingTab({ documentId }: MemberSharingTabProps) {
  const { t } = useTranslation();
  const [sharedUsers, setSharedUsers] = React.useState<SharedUser[]>([]);
  const [pendingUsers, setPendingUsers] = React.useState<SharedUser[]>([]);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const workspaceId = currentWorkspace?.id;

  const removeUser = (userId: string) => {
    setSharedUsers((prev) => prev.filter((user) => user.id !== userId));
  };

  const updatePermission = (userId: string, permission: "READ" | "EDIT") => {
    setSharedUsers((prev) => prev.map((user) => (user.id === userId ? { ...user, permission } : user)));
  };

  const copyPageAccessLink = () => {
    // TODO: Implement copy page access link functionality
    navigator.clipboard.writeText("https://app.example.com/shared/abc123");
    toast.success(t("Link copied to clipboard"));
  };

  const handleAddUsers = async () => {
    try {
      if (workspaceId && pendingUsers.length > 0) {
        // Share the document with pending users
        await documentApi.shareDocument(documentId, {
          targetUserIds: pendingUsers.filter(({ type }) => type === "user").map(({ id }) => id),
          targetGroupIds: pendingUsers.filter(({ type }) => type === "group").map(({ id }) => id),
          permission: pendingUsers[0]?.permission as "READ" | "EDIT",
          includeChildDocuments: true,
          workspaceId,
        });

        // Move pending users to shared users for display
        setSharedUsers((prev) => [...prev, ...pendingUsers]);
        setPendingUsers([]);
        setDialogOpen(false);

        toast.success(t("Document shared successfully"));
      }
    } catch (error) {
      toast.error(t("Failed to share document"));
    }
  };

  if (!workspaceId) {
    return <div className="text-sm text-muted-foreground p-4">{t("No workspace selected")}</div>;
  }

  return (
    <div className="space-y-2">
      {/* Add Members Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">{t("workspace members' permissions")}</Label>

          <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t("Add")}
          </Button>
        </div>
      </div>

      {/* Shared Users List */}
      {sharedUsers.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sharedUsers.map((user) => (
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
                <Select value={user.permission} onValueChange={(value: "READ" | "EDIT") => updatePermission(user.id, value)}>
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="READ">{t("View")}</SelectItem>
                    <SelectItem value="EDIT">{t("Edit")}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => removeUser(user.id)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Separator />

      {/* Link Sharing Section */}
      <div className="">
        <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md transition-colors" onClick={copyPageAccessLink}>
          <div className="text-sm  flex items-center gap-2 cursor-pointer">
            <Link className="h-4 w-4" />
            {t("Copy page access link")}
          </div>
        </div>
      </div>

      <AddMembersDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        pendingUsers={pendingUsers}
        onPendingUsersChange={setPendingUsers}
        onAddUsers={handleAddUsers}
      />
    </div>
  );
}
