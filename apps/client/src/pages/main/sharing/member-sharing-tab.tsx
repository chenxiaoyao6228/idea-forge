import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Link, X, Plus } from "lucide-react";
import { PermissionLevelSelector } from "@/components/ui/permission-level-selector";
import { showConfirmModal } from "@/components/ui/confirm-modal";
import useWorkspaceStore from "@/stores/workspace-store";
import useUserStore from "@/stores/user-store";
import { showAddMembersModal } from "./add-members-dialog";
import {
  useDocumentShares,
  useFetchDocumentShares,
  useAddDocumentShare,
  useUpdateDocumentSharePermission,
  useRemoveDocumentShare,
} from "@/stores/document-shares-store";
import { PermissionLevel } from "@idea/contracts";

interface MemberSharingTabProps {
  documentId: string;
}

interface SharedUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  permission: PermissionLevel;
  type: "user" | "group";
  memberCount?: number;
}

export function MemberSharingTab({ documentId }: MemberSharingTabProps) {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const currentUserId = useUserStore((s) => s.userInfo?.id);
  const workspaceId = currentWorkspace?.id;

  // Use store hooks
  const sharedUsers = useDocumentShares(documentId);
  const { run: fetchShares } = useFetchDocumentShares(documentId);
  const { run: addShare } = useAddDocumentShare(documentId);
  const { run: updatePermission } = useUpdateDocumentSharePermission(documentId);
  const { run: removeShare } = useRemoveDocumentShare(documentId);

  // Fetch shares when component mounts
  useEffect(() => {
    if (documentId) {
      fetchShares();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]); // Only depend on documentId, not fetchShares

  const handleRemoveUser = async (userId: string) => {
    // Check if user is trying to remove their own permission
    if (currentUserId && userId === currentUserId) {
      // Show confirmation modal
      const confirmed = await showConfirmModal({
        title: t("Remove Your Access"),
        description: t(
          "You are about to remove your own access to this document. After removal, you will no longer be able to view or edit this document. Do you want to continue?",
        ),
        confirmText: t("Remove Access"),
        cancelText: t("Cancel"),
        confirmVariant: "destructive",
        type: "alert",
      });

      if (!confirmed) {
        return; // User cancelled, don't proceed with the removal
      }
    }

    await removeShare({ targetUserId: userId });
  };

  const handleUpdatePermission = async (userId: string, permission: PermissionLevel) => {
    // Check if user is trying to change their own permission
    if (currentUserId && userId === currentUserId) {
      // Get current permission level
      const currentUser = sharedUsers.find((user) => user.id === userId);
      const currentPermission = currentUser?.permission.level;

      // Check if they're downgrading from a high permission level
      const currentPermissionLevel = currentPermission;
      const isDowngrading =
        (currentPermissionLevel === "OWNER" && permission !== "OWNER") || (currentPermissionLevel === "EDIT" && !["EDIT", "OWNER"].includes(permission));

      if (isDowngrading) {
        // Show custom confirmation modal
        const confirmed = await showConfirmModal({
          title: t("Change Permission Level"),
          description: t(
            "You are changing your permission level. After the change, you will lose your current high-level permissions. Do you want to continue?",
          ),
          confirmText: t("Continue"),
          cancelText: t("Cancel"),
          confirmVariant: "destructive",
          type: "alert",
        });

        if (!confirmed) {
          return; // User cancelled, don't proceed with the change
        }
      }
    }

    await updatePermission({ userId, permission });
  };

  const copyPageAccessLink = () => {
    // TODO: Implement copy page access link functionality
    navigator.clipboard.writeText("https://app.example.com/shared/abc123");
    toast.success(t("Link copied to clipboard"));
  };

  const handleAddMembers = () => {
    showAddMembersModal({
      onAddUsers: async (users: SharedUser[]) => {
        if (workspaceId && users.length > 0) {
          await addShare({
            targetUserIds: users.filter(({ type }) => type === "user").map(({ id }) => id),
            targetGroupIds: users.filter(({ type }) => type === "group").map(({ id }) => id),
            permission: users[0]?.permission as "READ" | "EDIT",
            includeChildDocuments: true,
            workspaceId,
          });
        }
      },
    });
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

          <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={handleAddMembers}>
            <Plus className="h-4 w-4 mr-1" />
            {t("Add")}
          </Button>
        </div>
      </div>

      {/* Shared Users List */}
      {sharedUsers.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {sharedUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-sm">{user.displayName?.charAt(0) || user.email.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 mr-2">
                  <div className="font-medium text-sm truncate">{user.displayName || user.email}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
                <PermissionLevelSelector
                  value={user.permission.level}
                  onChange={(value) => handleUpdatePermission(user.id, value)}
                  className="h-8 text-xs flex-shrink-0"
                />
                <Button variant="ghost" size="sm" onClick={() => handleRemoveUser(user.id)} className="h-8 w-8 p-0 flex-shrink-0">
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
    </div>
  );
}
