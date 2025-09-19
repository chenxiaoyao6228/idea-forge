import { create } from "zustand";
import { permissionApi } from "@/apis/permission";
import useRequest from "@ahooksjs/use-request";
import { toast } from "sonner";
import { useMemo } from "react";
import { useRefCallback } from "@/hooks/use-ref-callback";

/*
 * we don't need the UnifiedPermission Entity on the client
 * but the converted abilities
 */
export interface AbilityEntity {
  id: string; // resourceId (document, workspace, etc.)
  abilities: Record<string, boolean>;
  resourceType?: string; // DOCUMENT, WORKSPACE, SUBSPACE
}

interface PermissionInput {
  resourceId: string;
  abilities: Record<string, boolean>;
  resourceType?: string;
}

const defaultAbilities = Object.freeze({
  read: false,
  update: false,
  delete: false,
  share: false,
  comment: false,
} as Record<string, boolean>);

// Minimal store - only state
const useAbilityStore = create<{
  abilities: Record<string, AbilityEntity>;
}>((set) => ({
  abilities: {},
}));

// Fetch resource abilities hook
export const useFetchResourceAbilities = () => {
  return useRequest(
    async (params: { resourceType: string; resourceId: string }) => {
      try {
        const response = await permissionApi.getResourcePermissions(params.resourceType, params.resourceId);
        useAbilityStore.setState((state) => ({
          abilities: {
            ...state.abilities,
            [params.resourceId]: {
              id: params.resourceId,
              abilities: { ...defaultAbilities, ...response.data },
              resourceType: params.resourceType,
            },
          },
        }));
        return response.data;
      } catch (error) {
        console.error("Failed to fetch resource abilities:", error);
        toast.error("Failed to fetch permissions", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Set abilities hook
export const useSetAbilities = () => {
  return useRequest(
    async (permissions: Record<string, Record<string, boolean>>) => {
      try {
        const entities = Object.entries(permissions).map(([id, abilities]) => ({
          id,
          abilities: { ...defaultAbilities, ...abilities },
        }));

        useAbilityStore.setState((state) => {
          const newAbilities = { ...state.abilities };
          entities.forEach((entity) => {
            newAbilities[entity.id] = entity;
          });
          return { abilities: newAbilities };
        });

        return entities;
      } catch (error) {
        console.error("Failed to set abilities:", error);
        toast.error("Failed to set permissions", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Update ability hook
export const useUpdateAbility = () => {
  return useRequest(
    async (params: { id: string; abilities: Record<string, boolean> }) => {
      try {
        useAbilityStore.setState((state) => ({
          abilities: {
            ...state.abilities,
            [params.id]: {
              id: params.id,
              abilities: { ...defaultAbilities, ...params.abilities },
            },
          },
        }));
        return params.abilities;
      } catch (error) {
        console.error("Failed to update ability:", error);
        toast.error("Failed to update permission", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Add many abilities hook
export const useAddManyAbilities = () => {
  return useRequest(
    async (permissions: PermissionInput[]) => {
      try {
        const entities = permissions.map((permission) => ({
          id: permission.resourceId,
          abilities: { ...defaultAbilities, ...permission.abilities },
          resourceType: permission.resourceType,
        }));

        useAbilityStore.setState((state) => {
          const newAbilities = { ...state.abilities };
          entities.forEach((entity) => {
            newAbilities[entity.id] = entity;
          });
          return { abilities: newAbilities };
        });

        return entities;
      } catch (error) {
        console.error("Failed to add many abilities:", error);
        toast.error("Failed to add permissions", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

// Get abilities hook - returns memoized function
export const useGetAbilities = () => {
  const abilities = useAbilityStore((state) => state.abilities);
  return useRefCallback((id: string) => {
    const ability = abilities[id];
    return ability ? ability.abilities : defaultAbilities;
  });
};

// Has ability hook - returns memoized function
export const useHasAbility = () => {
  const getAbilities = useGetAbilities();
  return useRefCallback((id: string, action: string) => {
    const abilities = getAbilities(id);
    return abilities[action] || false;
  });
};

// Clear abilities hook
export const useClearAbilities = () => {
  return useRefCallback(() => {
    useAbilityStore.setState({ abilities: {} });
  });
};

// All abilities hook - returns memoized list
export const useAllAbilities = () => {
  const abilities = useAbilityStore((state) => state.abilities);
  return useMemo(() => {
    return Object.values(abilities);
  }, [abilities]);
};

export default useAbilityStore;
