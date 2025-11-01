import { createPrismaAbility } from "@casl/prisma";
import { AbilityBuilder, AbilityClass, PureAbility } from "@casl/ability";
import { Action } from "@idea/contracts";
import { ModelName } from "../database/prisma/prisma.extension";

export { Action } from "@idea/contracts";

export type Subjects = ModelName | "DocContent" | "all";
export type AppAbility = PureAbility<[Action, Subjects]>;
export const AppAbility = PureAbility as AbilityClass<AppAbility>;
export type AbilityFactory = (user: any) => AppAbility;

export abstract class BaseAbility {
  abstract createForUser(user: any, context?: Record<string, unknown>): Promise<AppAbility>;

  protected async createAbilityAsync(defineRules: (builder: AbilityBuilder<AppAbility>) => Promise<void>): Promise<AppAbility> {
    const builder = new AbilityBuilder<AppAbility>(createPrismaAbility);

    await defineRules(builder);

    return builder.build({
      conditionsMatcher: (conditions: unknown) => {
        return (object: Record<string, any>) => {
          // Type guard to ensure conditions is an object
          if (!conditions || typeof conditions !== "object") {
            return false;
          }

          const conditionsObj = conditions as Record<string, any>;

          if (!conditionsObj.OR && !conditionsObj.AND) {
            return Object.keys(conditionsObj).every((key) => object[key] === conditionsObj[key]);
          }

          if (conditionsObj.OR) {
            const mainCondition = Object.keys(conditionsObj)
              .filter((key) => key !== "OR")
              .every((key) => object[key] === conditionsObj[key]);

            const orCondition =
              Array.isArray(conditionsObj.OR) &&
              conditionsObj.OR.some((orCond: any) => orCond && typeof orCond === "object" && Object.keys(orCond).every((key) => object[key] === orCond[key]));

            return mainCondition || orCondition;
          }

          return true;
        };
      },
    }) as AppAbility;
  }
}
