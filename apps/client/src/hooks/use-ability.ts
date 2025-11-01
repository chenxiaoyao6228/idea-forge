import { useMemo } from "react";
import type { MongoAbility } from "@casl/ability";
import { subject as buildSubject } from "@casl/ability";
import { Action } from "@idea/contracts";
import { useSubjectAbility } from "@/stores/ability-store";

export { Action } from "@idea/contracts";

export function useAbility(subject: string): MongoAbility {
  return useSubjectAbility(subject);
}

const resolveSubject = (subject: string, object?: Record<string, unknown>) => {
  if (!object) return subject;
  return buildSubject(subject, object);
};

export function useAbilityCheck(subject: string, action: Action, object?: Record<string, unknown>): boolean {
  const ability = useSubjectAbility(subject);
  return ability.can(action, resolveSubject(subject, object));
}

export function useAbilityCan(subject: string, action: Action, object?: Record<string, unknown>): { can: boolean; ability: MongoAbility } {
  const ability = useSubjectAbility(subject);
  const can = useMemo(() => ability.can(action, resolveSubject(subject, object)), [ability, action, subject, object]);
  return { can, ability };
}
