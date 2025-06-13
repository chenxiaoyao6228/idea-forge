import { useMemo, useEffect } from "react";
import { createPrismaAbility } from "@casl/prisma";
import { PureAbility } from "@casl/ability";
import usePermissionStore from "@/stores/permission";

/**
 * Simple hook for boolean permission checks
 * Use this hook for straightforward permission validation
 *
 * @param entityId The entity ID (document, workspace, etc.)
 * @param action The action to check permission for
 * @param options Hook options containing required resourceType
 * @returns Boolean indicating if the permission is granted
 */
export function usePermission(entityId: string, action: string, resourceType: "DOCUMENT" | "WORKSPACE" | "SUBSPACE" = "DOCUMENT"): boolean {
  const hasPermission = usePermissionStore((state) => state.hasPermission);
  const getAbilities = usePermissionStore((state) => state.getAbilities);
  const fetchResourcePermissions = usePermissionStore((state) => state.fetchResourcePermissions);
  const isFetching = usePermissionStore((state) => state.isFetching);

  // Auto-fetch permissions when not available (always enabled)
  useEffect(() => {
    if (entityId && !isFetching) {
      const abilities = getAbilities(entityId);
      const hasNoAbilities = Object.keys(abilities).length === 0 || Object.values(abilities).every((value) => value === false);

      if (hasNoAbilities && fetchResourcePermissions) {
        fetchResourcePermissions(resourceType, entityId);
      }
    }
  }, [entityId, resourceType, getAbilities, fetchResourcePermissions, isFetching]);

  return hasPermission(entityId, action);
}

/**
 * Retrieve the abilities for a given entity and convert them to a CASL ability instance
 * Use this hook when:
 *  - Complex Permission Logic: When you need to check multiple permissions or combine them with complex logic
 *  - CASL Integration: When using @casl/react's <Can> component, which requires a CASL ability instance
 *  - Conditional Rendering with Multiple Actions: When you need to render UI based on combinations of permissions
 *
 * @param entityId The entity ID (document, workspace, etc.)
 * @param options Hook options containing required resourceType
 * @returns CASL ability instance for the entity
 */
export default function useCASLAbility(entityId: string, resourceType: "DOCUMENT" | "WORKSPACE" | "SUBSPACE" = "DOCUMENT"): PureAbility {
  const getAbilities = usePermissionStore((state) => state.getAbilities);
  const fetchResourcePermissions = usePermissionStore((state) => state.fetchResourcePermissions);
  const isFetching = usePermissionStore((state) => state.isFetching);

  // Auto-fetch permissions when not available (always enabled)
  useEffect(() => {
    if (entityId && !isFetching) {
      const abilities = getAbilities(entityId);
      const hasNoAbilities = Object.keys(abilities).length === 0 || Object.values(abilities).every((value) => value === false);

      if (hasNoAbilities && fetchResourcePermissions) {
        fetchResourcePermissions(resourceType, entityId);
      }
    }
  }, [entityId, resourceType, getAbilities, fetchResourcePermissions, isFetching]);

  const ability = useMemo(() => {
    if (!entityId) {
      return createPrismaAbility([]);
    }

    const abilities = getAbilities(entityId);

    // Map resource type to Prisma model name
    const subjectMap = {
      DOCUMENT: "Doc",
      WORKSPACE: "Workspace",
      SUBSPACE: "Subspace",
    };

    const subject = subjectMap[resourceType];

    const rules = Object.entries(abilities)
      .filter(([, allowed]) => allowed)
      .map(([action]) => ({
        action,
        subject,
        conditions: { id: entityId },
      }));

    return createPrismaAbility(rules);
  }, [entityId, getAbilities, resourceType]);

  return ability;
}
