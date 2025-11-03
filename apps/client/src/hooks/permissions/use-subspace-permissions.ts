import { useMemo } from "react";
import type { PureAbility } from "@casl/ability";
import { Action } from "@idea/contracts";
import { useAbilityCan } from "@/hooks/use-ability";

interface SubspacePermissions {
  /** User can view the subspace */
  canReadSubspace: boolean;
  /** User can update basic subspace properties */
  canUpdateSubspace: boolean;
  /** User can delete the subspace */
  canDeleteSubspace: boolean;
  /** User has full management rights (highest permission) */
  canManageSubspace: boolean;
  /** User can manage subspace settings */
  canManageSubspaceSettings: boolean;
  /** User can manage subspace members */
  canManageSubspaceMembers: boolean;
  /** User can view subspace members */
  canViewSubspaceMembers: boolean;
  /** User can manage permissions within the subspace */
  canManageSubspacePermissions: boolean;
  /** User can manage the subspace document structure/navigation tree */
  canManageSubspaceStructure: boolean;

  // Computed convenience flags
  /** User can edit subspace - computed as canUpdateSubspace OR canManageSubspace */
  canEditSubspace: boolean;
  /** User is subspace admin - same as canManageSubspace */
  isSubspaceAdmin: boolean;

  // Loading state
  /** Subspace permissions are still loading (subspaceId not available) */
  isLoadingSubspacePermissions: boolean;

  // Raw ability object for advanced usage
  /** CASL ability object for advanced permission checks */
  subspaceAbility: PureAbility;
}

/**
 * Hook for checking subspace-level permissions
 */
export function useSubspacePermissions(subspaceId: string | null | undefined): SubspacePermissions {
  // Build CASL subject for ability checks
  const subject = useMemo(() => {
    if (!subspaceId) return undefined;
    return { id: subspaceId };
  }, [subspaceId]);

  // Check all subspace permissions
  const { can: canReadSubspace, ability: subspaceAbility } = useAbilityCan("Subspace", Action.Read, subject);
  const { can: canUpdateSubspace } = useAbilityCan("Subspace", Action.Update, subject);
  const { can: canDeleteSubspace } = useAbilityCan("Subspace", Action.Delete, subject);
  const { can: canManageSubspace } = useAbilityCan("Subspace", Action.Manage, subject);
  const { can: canManageSubspaceSettings } = useAbilityCan("Subspace", Action.ManageSettings, subject);
  const { can: canManageSubspaceMembers } = useAbilityCan("Subspace", Action.ManageMembers, subject);
  const { can: canViewSubspaceMembers } = useAbilityCan("Subspace", Action.ViewMembers, subject);
  const { can: canManageSubspacePermissions } = useAbilityCan("Subspace", Action.ManagePermissions, subject);
  const { can: canManageSubspaceStructure } = useAbilityCan("Subspace", Action.ManageStructure, subject);

  return {
    // Raw permissions
    canReadSubspace,
    canUpdateSubspace,
    canDeleteSubspace,
    canManageSubspace,
    canManageSubspaceSettings,
    canManageSubspaceMembers,
    canViewSubspaceMembers,
    canManageSubspacePermissions,
    canManageSubspaceStructure,

    // Computed convenience flags
    canEditSubspace: canUpdateSubspace || canManageSubspace,
    isSubspaceAdmin: canManageSubspace,

    // Loading state
    isLoadingSubspacePermissions: !subject,

    // Raw ability for advanced usage
    subspaceAbility,
  };
}
