import { create } from "zustand";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { createMongoAbility, type MongoAbility } from "@casl/ability";
import { unpackRules } from "@casl/ability/extra";
import type { SerializedAbility, SerializedAbilityMap } from "@idea/contracts";

interface SubjectAbilityEntry {
  ability: MongoAbility;
  serialized: SerializedAbility;
}

// Use createMongoAbility instead of createPrismaAbility to support $in operator
const emptyAbility = createMongoAbility([]);

const deserializeAbility = (serialized: SerializedAbility): MongoAbility => {
  return createMongoAbility(unpackRules(serialized.rules));
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
        const subjectKey = serialized?.subject ?? subject;
        if (subject !== subjectKey && subject in nextSubjectAbilities) {
          delete nextSubjectAbilities[subject];
        }
        nextSubjectAbilities[subjectKey] = {
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
    const subjectKey = serialized?.subject ?? subject;
    useAbilityStore.setState((state) => ({
      ...state,
      subjectAbilities: (() => {
        const next = { ...state.subjectAbilities };
        if (subject !== subjectKey && subject in next) {
          delete next[subject];
        }
        next[subjectKey] = {
          serialized,
          ability: deserializeAbility(serialized),
        };
        return next;
      })(),
    }));
  });
};

export const useSubjectAbility = (subject: string): MongoAbility => {
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
