import { create } from "zustand";
import { permissionApi } from "@/apis/permission";
import useRequest from "@ahooksjs/use-request";
import { toast } from "sonner";
import { useMemo } from "react";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { createPrismaAbility } from "@casl/prisma";
import { unpackRules } from "@casl/ability/extra";
import type { PureAbility } from "@casl/ability";
import type { SerializedAbility, SerializedAbilityMap } from "@idea/contracts";

/*
 * Resource-level permission entry (legacy boolean maps per entity).
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

interface SubjectAbilityEntry {
  ability: PureAbility;
  serialized: SerializedAbility;
}

const defaultAbilities = Object.freeze({
  read: false,
  update: false,
  delete: false,
  share: false,
  comment: false,
} as Record<string, boolean>);

const emptyAbility = createPrismaAbility([]);

const deserializeAbility = (serialized: SerializedAbility): PureAbility => {
  return createPrismaAbility(unpackRules(serialized.rules));
};

interface AbilityStoreState {
  abilities: Record<string, AbilityEntity>;
  subjectAbilities: Record<string, SubjectAbilityEntry>;
}

const useAbilityStore = create<AbilityStoreState>(() => ({
  abilities: {},
  subjectAbilities: {},
}));

// ==== Subject-level helpers ==================================================

export const useInitializeSubjectAbilities = () => {
  return useRefCallback((abilities: SerializedAbilityMap | null | undefined) => {
    if (!abilities) return;

    useAbilityStore.setState((state) => {
      const nextSubjectAbilities = { ...state.subjectAbilities };

      Object.entries(abilities).forEach(([subject, serialized]) => {
        nextSubjectAbilities[subject] = {
          serialized,
          ability: deserializeAbility(serialized),
        };
      });

      return {
        ...state,
        subjectAbilities: nextSubjectAbilities,
      };
    });
  });
};

export const useSetSubjectAbility = () => {
  return useRefCallback((subject: string, serialized: SerializedAbility) => {
    useAbilityStore.setState((state) => ({
      ...state,
      subjectAbilities: {
        ...state.subjectAbilities,
        [subject]: {
          serialized,
          ability: deserializeAbility(serialized),
        },
      },
    }));
  });
};

export const useSubjectAbility = (subject: string): PureAbility => {
  return useAbilityStore((state) => state.subjectAbilities[subject]?.ability ?? emptyAbility);
};

export const useSubjectAbilities = () => {
  return useAbilityStore((state) => state.subjectAbilities);
};

// ==== Resource-level helpers (legacy boolean maps) ===========================

export const useFetchResourceAbilities = () => {
  return useRequest(
    async (params: { resourceType: string; resourceId: string }) => {
      try {
        const response = await permissionApi.getResourcePermissions(params.resourceType, params.resourceId);
        useAbilityStore.setState((state) => ({
          ...state,
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
          return { ...state, abilities: newAbilities };
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

export const useUpdateAbility = () => {
  return useRequest(
    async (params: { id: string; abilities: Record<string, boolean> }) => {
      try {
        useAbilityStore.setState((state) => ({
          ...state,
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
          return { ...state, abilities: newAbilities };
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

export const useGetAbilities = () => {
  const abilities = useAbilityStore((state) => state.abilities);
  return useRefCallback((id: string) => {
    const ability = abilities[id];
    return ability ? ability.abilities : defaultAbilities;
  });
};

export const useHasAbility = () => {
  const getAbilities = useGetAbilities();
  return useRefCallback((id: string, action: string) => {
    const abilities = getAbilities(id);
    return abilities[action] || false;
  });
};

export const useClearAbilities = () => {
  return useRefCallback(() => {
    useAbilityStore.setState({ abilities: {}, subjectAbilities: {} });
  });
};

export const useInitializeAbilities = () => {
  return useRefCallback((abilities: Record<string, Record<string, boolean>>, resourceType = "WORKSPACE") => {
    const entities = Object.entries(abilities).map(([id, abilityMap]) => ({
      id,
      abilities: { ...defaultAbilities, ...abilityMap },
      resourceType,
    }));

    useAbilityStore.setState((state) => {
      const newAbilities = { ...state.abilities };
      entities.forEach((entity) => {
        newAbilities[entity.id] = entity;
      });
      return { ...state, abilities: newAbilities };
    });

    return entities;
  });
};

export const useAllAbilities = () => {
  const abilities = useAbilityStore((state) => state.abilities);
  return useMemo(() => Object.values(abilities), [abilities]);
};

export default useAbilityStore;
