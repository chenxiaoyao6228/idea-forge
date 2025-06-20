import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";

export const ABILITY_FACTORY_KEY = "__ABILITY_FACTORY_KEY__";

/**
 * Mark Service as Ability
 * @param model
 * @returns
 */
export function DefineAbility(model: ModelName): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(ABILITY_FACTORY_KEY, model, target);
  };
}
