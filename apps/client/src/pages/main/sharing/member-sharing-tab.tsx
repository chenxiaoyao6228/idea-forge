import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Link, X, Plus, Users, UserCheck, RotateCcw } from "lucide-react";
import { PermissionLevelSelector } from "@/components/ui/permission-level-selector";
import { showConfirmModal } from "@/components/ui/confirm-modal";
import useWorkspaceStore from "@/stores/workspace-store";
import useUserStore from "@/stores/user-store";
import useDocumentStore from "@/stores/document-store";
import { useAbilityCheck, Action } from "@/hooks/use-ability";
import { showAddMembersModal } from "./add-members-dialog";
import type { SharedUser } from "./add-members-dialog";
import {
  useDocumentShares,
  useDocumentUserShares,
  useDocumentGroupShares,
  useFetchDocumentShares,
  useAddDocumentShare,
  useUpdateDocumentSharePermission,
  useRemoveDocumentShare,
  useRemoveDocumentGroupShare,
} from "@/stores/document-shares-store";
import { PermissionLevel } from "@idea/contracts";
import { useCurrentDocumentFromStore } from "@/stores/document-store";
import { useFetchSubspaceSettings } from "@/stores/subspace-store";
import useSubSpaceStore from "@/stores/subspace-store";
import { documentApi } from "@/apis/document";
import { UpdateDocumentSubspacePermissionsDto } from "@idea/contracts";
import useRequest from "@ahooksjs/use-request";

interface MemberSharingTabProps {
  documentId: string;
}

export function MemberSharingTab({ documentId }: MemberSharingTabProps) {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  const currentUserId = useUserStore((s) => s.userInfo?.id);
  const workspaceId = currentWorkspace?.id;
  const currentDocument = useCurrentDocumentFromStore();

  // Use store hooks
  const sharedUsers = useDocumentUserShares(documentId);
  const sharedGroups = useDocumentGroupShares(documentId);
  const allShares = useDocumentShares(documentId);
  const { run: fetchShares } = useFetchDocumentShares(documentId);
  const { run: addShare } = useAddDocumentShare(documentId);
  const { run: updatePermission } = useUpdateDocumentSharePermission(documentId);
  const { run: removeShare } = useRemoveDocumentShare(documentId);
  const { run: removeGroupShare } = useRemoveDocumentGroupShare(documentId);

  // Get subspace settings from store
  const subspaceSettings = useSubSpaceStore((state) => state.subspaceSettings);

  // Check if user can share this document (all logic is server-side in CASL)
  const canShare = useAbilityCheck("Doc", Action.Share, currentDocument ? { id: currentDocument.id } : undefined);
  const canManage = useAbilityCheck("Subspace", Action.Manage, currentDocument ? { id: currentDocument.subspaceId } : undefined);

  // Fetch subspace settings if document is in a subspace
  const { run: fetchSubspaceSettings } = useFetchSubspaceSettings(currentDocument?.subspaceId || "");

  // Fetch subspace settings when component mounts and document has a subspace
  useEffect(() => {
    if (currentDocument?.subspaceId) {
      fetchSubspaceSettings();
    }
  }, [currentDocument?.subspaceId, fetchSubspaceSettings]);

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

  const handleRemoveGroup = async (groupId: string) => {
    await removeGroupShare({ targetGroupId: groupId });
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
        (currentPermissionLevel === "MANAGE" && permission !== "MANAGE") || (currentPermissionLevel === "EDIT" && !["EDIT", "MANAGE"].includes(permission));

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
    // Copy the current page URL from the browser address bar
    navigator.clipboard.writeText(window.location.href);
    toast.success(t("Link copied to clipboard"));
  };

  // Hook for updating document subspace permissions
  const { run: updateDocumentSubspacePermission, loading: isUpdatingPermissions } = useRequest(
    async (params: { permissionType: string; value: PermissionLevel }) => {
      const { permissionType, value } = params;

      const updateData: UpdateDocumentSubspacePermissionsDto = {};

      switch (permissionType) {
        case "subspaceAdminPermission":
          updateData.subspaceAdminPermission = value;
          break;
        case "subspaceMemberPermission":
          updateData.subspaceMemberPermission = value;
          break;
        case "nonSubspaceMemberPermission":
          updateData.nonSubspaceMemberPermission = value;
          break;
      }

      try {
        const updatedDocument = await documentApi.updateSubspacePermissions(documentId, updateData);

        // Update the document in the store with the new subspace permission data
        useDocumentStore.setState((state) => {
          const currentDocument = state.documents[documentId];
          if (currentDocument) {
            return {
              documents: {
                ...state.documents,
                [documentId]: {
                  ...currentDocument,
                  subspaceAdminPermission: updatedDocument.subspaceAdminPermission,
                  subspaceMemberPermission: updatedDocument.subspaceMemberPermission,
                  nonSubspaceMemberPermission: updatedDocument.nonSubspaceMemberPermission,
                },
              },
            };
          }
          return state;
        });

        toast.success(t("Document permissions updated"));
        return updatedDocument;
      } catch (error) {
        console.error("Failed to update document subspace permissions:", error);
        toast.error(t("Failed to update permissions"));
        throw error;
      }
    },
    { manual: true },
  );

  const handleUpdateDocumentSubspacePermission = (permissionType: string, value: PermissionLevel) => {
    updateDocumentSubspacePermission({ permissionType, value });
  };

  // Check if document has any permission overrides
  const hasDocumentOverrides =
    currentDocument?.subspaceAdminPermission !== null ||
    currentDocument?.subspaceMemberPermission !== null ||
    currentDocument?.nonSubspaceMemberPermission !== null;

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
      {/* Subspace Role-Based Permissions Section */}
      {currentDocument?.subspaceId && subspaceSettings && currentDocument?.subspace?.type !== "PERSONAL" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">{t("Subspace Role-Based Permissions")}</Label>
              {hasDocumentOverrides ? <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">{t("Document Override")}</span> : null}
            </div>
          </div>

          <div className="space-y-2 p-3 bg-blue-50 rounded-lg border">
            {/* Admin Permissions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{t("Subspace Admins")}</span>
                <span className="text-xs text-muted-foreground">
                  ({subspaceSettings.subspace.members.filter((m) => m.role === "ADMIN").length} {t("members")})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PermissionLevelSelector
                  value={currentDocument.subspaceAdminPermission ?? subspaceSettings.subspace.subspaceAdminPermission}
                  onChange={(value) => handleUpdateDocumentSubspacePermission("subspaceAdminPermission", value)}
                  disabled={isUpdatingPermissions || !canManage}
                />
              </div>
            </div>

            {/* Member Permissions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">{t("Subspace Members")}</span>
                <span className="text-xs text-muted-foreground">
                  ({subspaceSettings.subspace.members.filter((m) => m.role === "MEMBER").length} {t("members")})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PermissionLevelSelector
                  value={currentDocument.subspaceMemberPermission ?? subspaceSettings.subspace.subspaceMemberPermission}
                  onChange={(value) => handleUpdateDocumentSubspacePermission("subspaceMemberPermission", value)}
                  disabled={isUpdatingPermissions || !canManage}
                />
              </div>
            </div>

            {/* All-Member Permissions */}
            {
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{t("Other Members")}</span>
                  <span className="text-xs text-muted-foreground">({t("-- members")})</span>
                </div>
                <div className="flex items-center gap-2">
                  <PermissionLevelSelector
                    value={currentDocument.nonSubspaceMemberPermission ?? subspaceSettings.subspace.nonSubspaceMemberPermission}
                    onChange={(value) => handleUpdateDocumentSubspacePermission("nonSubspaceMemberPermission", value)}
                    disabled={isUpdatingPermissions || !canManage}
                  />
                </div>
              </div>
            }

            <div className="text-xs text-muted-foreground mt-2">
              {hasDocumentOverrides
                ? t("This document has custom permission settings that override the subspace defaults.")
                : t("These permissions are inherited from the subspace settings and apply to all documents in this subspace.")}
            </div>
          </div>
        </div>
      )}

      {/* Individual Document Shares Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-2">{t("User/Group Permissions")}</Label>

          <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={handleAddMembers} disabled={!canShare}>
            <Plus className="h-4 w-4 mr-1" />
            {t("Add")}
          </Button>
        </div>
      </div>

      {allShares.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {/* Shared Groups List */}
            {sharedGroups.map((group) => (
              <div key={group.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0 mr-2">
                  <div className="font-medium text-sm truncate">{group.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {group.memberCount} {t("members")}
                    {group.description && ` • ${group.description}`}
                  </div>
                </div>
                <PermissionLevelSelector
                  value={group.permission.level}
                  onChange={(value) => handleUpdatePermission(group.id, value)}
                  className="h-8 text-xs flex-shrink-0"
                />
                <Button variant="ghost" size="sm" onClick={() => handleRemoveGroup(group.id)} className="h-8 w-8 p-0 flex-shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Shared Users List */}
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

      {/* No shares message */}
      {allShares.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{t("No users or groups have been shared with this document")}</p>
        </div>
      )}

      <Separator />

      {/* Link Sharing Section */}

      <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 rounded-md transition-colors" onClick={copyPageAccessLink}>
        <div className="text-sm  flex items-center gap-2 p-1 cursor-pointer">
          <Link className="h-4 w-4" />
          {t("Copy page access link")}
        </div>
      </div>
    </div>
  );
}
