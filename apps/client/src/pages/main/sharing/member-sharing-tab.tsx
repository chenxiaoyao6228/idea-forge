import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Users, UserCheck, Info } from "lucide-react";
import { PermissionLevelSelector } from "@/components/ui/permission-level-selector";
import { showConfirmModal } from "@/components/ui/confirm-modal";
import useWorkspaceStore from "@/stores/workspace-store";
import useUserStore from "@/stores/user-store";
import useDocumentStore from "@/stores/document-store";
import { useAbilityCheck, Action } from "@/hooks/use-ability";
import { showAddMembersModal } from "./add-members-dialog";
import type { SharedUser } from "./add-members-dialog";
import { showRequestPermissionModal } from "./request-permission-modal";
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
import { useIsGuestCollaborator } from "@/stores/guest-collaborators-store";
import { CopyAccessLink } from "./copy-access-link";

interface MemberSharingTabProps {
  documentId: string;
}

// Helper function to generate permission tooltip text based on permission state
function getPermissionTooltip(
  permissionSource: any,
  hasParentPermission: boolean,
  t: (key: string) => string,
  grantedBy?: { displayName: string | null; email: string },
  parentPermissionSource?: any,
): string | null {
  if (!permissionSource) return null;

  const { source, sourceDocTitle } = permissionSource;

  // State 1: Direct/Group permission on child that overrides parent permission
  // User/Group has BOTH parent permission AND direct/group permission on child
  if ((source === "direct" || source === "group") && hasParentPermission) {
    const parentDocTitle = parentPermissionSource?.sourceDocTitle || "parent document";
    return t(
      `Permission overridden from parent document '${parentDocTitle}' inherited permission. To restore inherited permission, select 'Restore Inherited' from dropdown`,
    );
  }

  // State 2: Direct permission (not inherited, no parent permission)
  // User ONLY has direct permission on this document, no parent permission exists
  if (source === "direct") {
    if (grantedBy) {
      return t(`Granted by ${grantedBy.displayName || grantedBy.email}`);
    }
    return t("Direct permission granted on this document");
  }

  // State 3: Group permission (not inherited, no parent permission)
  // Group ONLY has permission on this document, no parent permission exists
  if (source === "group") {
    if (grantedBy) {
      return t(`Granted by ${grantedBy.displayName || grantedBy.email}`);
    }
    return t("Group permission granted on this document");
  }

  // State 4: Inherited from parent (no override)
  // User does NOT have direct permission on this document, permission comes from parent
  if (source === "inherited") {
    return t(`Inherited from parent document: "${sourceDocTitle || "Unknown"}". If need to change the permission setting, you can overwrite`);
  }

  // State 5: Subspace permission
  if (source === "subspace") {
    return t("Permission from subspace membership");
  }

  // State 6: Workspace permission
  if (source === "workspace") {
    return t("Permission from workspace membership");
  }

  return null;
}

// Helper function for subspace permission tooltips
function getSubspacePermissionTooltip(subspaceName: string, hasOverride: boolean, t: (key: string) => string): string {
  if (hasOverride) {
    return t(`Permission overridden from subspace '${subspaceName}' inherited permission. To restore default, select 'Restore Inherited' from dropdown`);
  }
  return t(`Permission inherited from subspace '${subspaceName}'. If need to change the permission setting, you can overwrite`);
}

export function MemberSharingTab({ documentId }: MemberSharingTabProps) {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  const currentUserId = useUserStore((s) => s.userInfo?.id);
  const currentUser = useUserStore((s) => s.userInfo);
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
  const isGuestCollaborator = useIsGuestCollaborator();

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

  const handleUpdateGroupPermission = async (groupId: string, permission: PermissionLevel) => {
    await updatePermission({ groupId, permission });
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

  // Hook for updating document subspace permissions
  const { run: updateDocumentSubspacePermission, loading: isUpdatingPermissions } = useRequest(
    async (params: { permissionType: string; value: PermissionLevel | null }) => {
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

  const handleUpdateDocumentSubspacePermission = (permissionType: string, value: PermissionLevel | null) => {
    updateDocumentSubspacePermission({ permissionType, value });
  };

  const hasSubspaceAdminDocumentPermissionOverrides = currentDocument?.subspaceAdminPermission !== null;
  const hasSubspaceMemberDocumentPermissionOverrides = currentDocument?.subspaceMemberPermission !== null;
  const hasNonSubspaceMemberPermissionDocumentPermissionOverrides = currentDocument?.nonSubspaceMemberPermission !== null;

  const handleAddMembers = () => {
    showAddMembersModal({
      existingShares: allShares.map((share) => share.id),
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

  const handlePermissionRequest = async (requestedPermission: string, reason: string) => {
    try {
      const response = await documentApi.requestPermission(documentId, {
        requestedPermission: requestedPermission as "READ" | "COMMENT" | "EDIT" | "MANAGE",
        reason,
      });

      if (response.success) {
        toast.success(response.message || t("Permission request submitted. An administrator will review your request."));
      }
    } catch (error: any) {
      console.error("Failed to submit permission request:", error);
      toast.error(error.message || t("Failed to submit permission request"));
      throw error; // Re-throw to be handled by modal
    }
  };

  // Find current user's permission from share list
  // This shows the final resolved permission (highest level from all sources)
  // The API now always includes the current user if they have any permission
  const currentUserPermission = currentUserId ? sharedUsers.find((user) => user.id === currentUserId) : null;

  // Helper to get permission level display text
  const getPermissionLevelText = (level: string) => {
    switch (level) {
      case "MANAGE":
        return t("Manage");
      case "EDIT":
        return t("Edit");
      case "COMMENT":
        return t("Comment");
      case "READ":
        return t("View");
      case "NONE":
        return t("No Access");
      default:
        return level;
    }
  };

  if (!workspaceId) {
    return <div className="text-sm text-muted-foreground p-4">{t("No workspace selected")}</div>;
  }

  if (isGuestCollaborator) {
    return (
      <div className="space-y-4">
        <div className="text-sm text-muted-foreground px-2 pt-2">{t("You are a guest collaborator and cannot manage members permissions")}</div>
        <Separator />
        <CopyAccessLink />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current User Permission Section */}
      {currentUserPermission && (
        <div className="py-2 px-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("Your permission")}:</span>
                <Badge variant="secondary" className="font-medium">
                  {getPermissionLevelText(currentUserPermission.permission.level)}
                </Badge>
              </div>
              {currentUserPermission.permissionSource && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                      <p className="text-xs whitespace-normal">
                        {getPermissionTooltip(
                          currentUserPermission.permissionSource,
                          currentUserPermission.hasParentPermission || false,
                          t,
                          currentUserPermission.grantedBy,
                          currentUserPermission.parentPermissionSource,
                        )}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {currentUserPermission.permission.level !== "MANAGE" && (
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() =>
                  showRequestPermissionModal({
                    currentPermission: currentUserPermission.permission.level as any,
                    onSubmit: handlePermissionRequest,
                  })
                }
              >
                {t("Request Permission")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Show tip when current user is not in the subspace */}
      {/* {currentUser && !subspaceSettings?.subspace?.members.some((member) => member.userId === currentUser.id) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-800">
              {t(
                "This page might be shared by others, but since you don't have parent page permissions or aren't in the subspace where the page is located, you can't access all permission information for the page.",
              )}
            </p>
          </div>
        </div>
      )} */}

      {/* Subspace  Permissions Section */}

      <div>
        {currentDocument?.subspaceId && subspaceSettings && currentDocument?.subspace?.type !== "PERSONAL" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">{t("Subspace Member Permissions")}</Label>
              </div>
              <Button variant="outline" size="sm" className="h-8 bg-transparent" onClick={handleAddMembers} disabled={!canShare}>
                <Plus className="h-4 w-4 mr-1" />
                {t("Add")}
              </Button>
            </div>

            <div className="space-y-2">
              {/* Admin Permissions */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">{t("Subspace Admins")}</span>
                        <span className="text-xs text-muted-foreground">
                          ({subspaceSettings.subspace.members.filter((m) => m.role === "ADMIN").length} {t("members")})
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <PermissionLevelSelector
                          value={currentDocument.subspaceAdminPermission ?? subspaceSettings.subspace.subspaceAdminPermission}
                          onChange={(value) => handleUpdateDocumentSubspacePermission("subspaceAdminPermission", value)}
                          disabled={isUpdatingPermissions || !canManage}
                          showRestoreInherited={hasSubspaceAdminDocumentPermissionOverrides}
                          onRestoreInherited={() => handleUpdateDocumentSubspacePermission("subspaceAdminPermission", null)}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px]">
                    <p className="text-xs whitespace-normal">
                      {getSubspacePermissionTooltip(subspaceSettings.subspace.name, currentDocument.subspaceAdminPermission !== null, t)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Member Permissions */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">{t("Subspace Members")}</span>
                        <span className="text-xs text-muted-foreground">
                          ({subspaceSettings.subspace.members.filter((m) => m.role === "MEMBER").length} {t("members")})
                        </span>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <PermissionLevelSelector
                          value={currentDocument.subspaceMemberPermission ?? subspaceSettings.subspace.subspaceMemberPermission}
                          onChange={(value) => handleUpdateDocumentSubspacePermission("subspaceMemberPermission", value)}
                          disabled={isUpdatingPermissions || !canManage}
                          showRestoreInherited={hasSubspaceMemberDocumentPermissionOverrides}
                          onRestoreInherited={() => handleUpdateDocumentSubspacePermission("subspaceMemberPermission", null)}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[300px]">
                    <p className="text-xs whitespace-normal">
                      {getSubspacePermissionTooltip(subspaceSettings.subspace.name, currentDocument.subspaceMemberPermission !== null, t)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* All-Member Permissions */}
              {
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-600" />
                          <span className="text-sm font-medium">{t("Other Members")}</span>
                          <span className="text-xs text-muted-foreground">({t("-- members")})</span>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <PermissionLevelSelector
                            value={currentDocument.nonSubspaceMemberPermission ?? subspaceSettings.subspace.nonSubspaceMemberPermission}
                            onChange={(value) => handleUpdateDocumentSubspacePermission("nonSubspaceMemberPermission", value)}
                            disabled={isUpdatingPermissions || !canManage}
                            showRestoreInherited={hasNonSubspaceMemberPermissionDocumentPermissionOverrides}
                            onRestoreInherited={() => handleUpdateDocumentSubspacePermission("nonSubspaceMemberPermission", null)}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[300px]">
                      <p className="text-xs whitespace-normal">
                        {getSubspacePermissionTooltip(subspaceSettings.subspace.name, currentDocument.nonSubspaceMemberPermission !== null, t)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              }
            </div>
          </div>
        )}

        {allShares.length > 0 && (
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {/* Shared Groups List */}
            {sharedGroups.map((group) => {
              // Determine permission state using hasParentPermission flag
              const hasParentPermission = group.hasParentPermission || false;
              const isDirectGroupShare = group.permissionSource?.source === "group";

              // Show "Restore Inherited" when user has DIRECT permission that overrides parent
              // Show "Remove" only when user has DIRECT permission but NO parent permission to fall back to
              const showRestoreInherited = hasParentPermission && isDirectGroupShare;
              const showRemove = isDirectGroupShare && !hasParentPermission;

              const tooltipText = getPermissionTooltip(group.permissionSource, hasParentPermission, t, group.grantedBy, group.parentPermissionSource);

              return (
                <TooltipProvider key={group.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 py-2 rounded-md ">
                        <div className="h-8 w-8 flex-shrink-0 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="font-medium text-sm truncate flex items-center gap-1">
                            {group.name}
                            {tooltipText && <Info className="h-3 w-3 text-blue-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {group.memberCount} {t("members")}
                            {group.description && ` • ${group.description}`}
                          </div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <PermissionLevelSelector
                            value={group.permission.level as PermissionLevel}
                            onChange={(value) => handleUpdateGroupPermission(group.id, value)}
                            className="h-8 text-xs flex-shrink-0"
                            showRestoreInherited={showRestoreInherited}
                            onRestoreInherited={() => handleRemoveGroup(group.id)}
                            showRemove={showRemove}
                            onRemove={() => handleRemoveGroup(group.id)}
                            disabled={isUpdatingPermissions || !canManage}
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

            {/* Shared Users List */}
            {sharedUsers.map((user) => {
              // Determine permission state using hasParentPermission flag
              const hasParentPermission = user.hasParentPermission || false;
              const isDirect = user.permissionSource?.source === "direct";

              // Show "Restore Inherited" when user has DIRECT permission that overrides parent
              // Show "Remove" only when user has DIRECT permission but NO parent permission to fall back to
              const showRestoreInherited = hasParentPermission && isDirect;
              const showRemove = isDirect && !hasParentPermission;

              const tooltipText = getPermissionTooltip(user.permissionSource, hasParentPermission, t, user.grantedBy, user.parentPermissionSource);

              return (
                <TooltipProvider key={user.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 py-2 rounded-md">
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className="text-sm">{user.displayName?.charAt(0) || user.email.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 mr-2">
                          <div className="font-medium text-sm truncate flex items-center gap-1">
                            {user.displayName || user.email}
                            {tooltipText && <Info className="h-3 w-3 text-blue-500" />}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                        <div onClick={(e) => e.stopPropagation()}>
                          <PermissionLevelSelector
                            value={user.permission.level as PermissionLevel}
                            onChange={(value) => handleUpdatePermission(user.id, value)}
                            className="h-8 text-xs flex-shrink-0"
                            showRestoreInherited={showRestoreInherited}
                            onRestoreInherited={() => handleRemoveUser(user.id)}
                            showRemove={showRemove}
                            onRemove={() => handleRemoveUser(user.id)}
                            disabled={isUpdatingPermissions || !canManage}
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
        )}
      </div>

      <Separator />

      {/* Link Sharing Section */}

      <CopyAccessLink />
    </div>
  );
}
