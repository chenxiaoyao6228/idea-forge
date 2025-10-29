import { useMemo } from "react";
import type { PureAbility } from "@casl/ability";
import { Action } from "@idea/contracts";
import { useAbilityCan } from "@/hooks/use-ability";
interface WorkspacePermissions {
  /** User can view the workspace */
  canReadWorkspace: boolean;
  /** User can update basic workspace properties */
  canUpdateWorkspace: boolean;
  /** User can delete the workspace */
  canDeleteWorkspace: boolean;
  /** User has full management rights (highest permission) */
  canManageWorkspace: boolean;
  /** User can manage workspace settings */
  canManageWorkspaceSettings: boolean;
  /** User can manage workspace members */
  canManageWorkspaceMembers: boolean;
  /** User can manage subspaces within the workspace */
  canManageWorkspaceSubspaces: boolean;
  /** User can transfer ownership of the workspace */
  canTransferWorkspaceOwnership: boolean;

  // Computed convenience flags
  /** User can edit workspace - computed as canManageWorkspaceSettings OR canManageWorkspace */
  canEditWorkspace: boolean;
  /** User is workspace owner or admin - same as canManageWorkspace */
  isWorkspaceOwnerOrAdmin: boolean;

  // Loading state
  /** Workspace permissions are still loading (workspaceId not available) */
  isLoadingWorkspacePermissions: boolean;

  // Raw ability object for advanced usage
  /** CASL ability object for advanced permission checks */
  workspaceAbility: PureAbility;
}

/**
 * Hook for checking workspace-level permissions
 */
export function useWorkspacePermissions(workspaceId: string | null | undefined): WorkspacePermissions {
  // Build CASL subject for ability checks
  const subject = useMemo(() => {
    if (!workspaceId) return undefined;
    return { id: workspaceId };
  }, [workspaceId]);

  // Check all workspace permissions
  const { can: canReadWorkspace, ability: workspaceAbility } = useAbilityCan("Workspace", Action.Read, subject);
  const { can: canUpdateWorkspace } = useAbilityCan("Workspace", Action.Update, subject);
  const { can: canDeleteWorkspace } = useAbilityCan("Workspace", Action.Delete, subject);
  const { can: canManageWorkspace } = useAbilityCan("Workspace", Action.Manage, subject);
  const { can: canManageWorkspaceSettings } = useAbilityCan("Workspace", Action.ManageSettings, subject);
  const { can: canManageWorkspaceMembers } = useAbilityCan("Workspace", Action.ManageMembers, subject);
  const { can: canManageWorkspaceSubspaces } = useAbilityCan("Workspace", Action.ManageSubspaces, subject);
  const { can: canTransferWorkspaceOwnership } = useAbilityCan("Workspace", Action.TransferOwnership, subject);

  return {
    // Raw permissions
    canReadWorkspace,
    canUpdateWorkspace,
    canDeleteWorkspace,
    canManageWorkspace,
    canManageWorkspaceSettings,
    canManageWorkspaceMembers,
    canManageWorkspaceSubspaces,
    canTransferWorkspaceOwnership,

    // Computed convenience flags
    canEditWorkspace: canManageWorkspaceSettings || canManageWorkspace,
    isWorkspaceOwnerOrAdmin: canManageWorkspace,

    // Loading state
    isLoadingWorkspacePermissions: !subject,

    // Raw ability for advanced usage
    workspaceAbility,
  };
}
