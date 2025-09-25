import { create } from "zustand";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { createPrismaAbility } from "@casl/prisma";
import { unpackRules } from "@casl/ability/extra";
import type { PureAbility } from "@casl/ability";
import type { SerializedAbility, SerializedAbilityMap } from "@idea/contracts";

interface SubjectAbilityEntry {
  ability: PureAbility;
  serialized: SerializedAbility;
}

const emptyAbility = createPrismaAbility([]);

const deserializeAbility = (serialized: SerializedAbility): PureAbility => {
  return createPrismaAbility(unpackRules(serialized.rules));
};

interface AbilityStoreState {
  subjectAbilities: Record<string, SubjectAbilityEntry>;
}

const useAbilityStore = create<AbilityStoreState>(() => ({
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

export const useClearAbilities = () => {
  return useRefCallback(() => {
    useAbilityStore.setState({ subjectAbilities: {} });
  });
};

export default useAbilityStore;
