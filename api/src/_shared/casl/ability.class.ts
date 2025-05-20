import { AbilityBuilder, AbilityClass, PureAbility } from "@casl/ability";
import { ModelName } from "@/_shared/database/prisma/prisma.extension";
import { User } from "@prisma/client";

export enum Action {
  Manage = "manage",
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",

  // Doc specific
  View = "view",
  Comment = "comment",
  Edit = "edit",
  Share = "share",
  Move = "move",

  // Workspace specific
  Invite = "invite",
  RemoveMember = "removeMember",
}

export type Subjects = ModelName | "all";

export type AppAbility = PureAbility<[Action, Subjects]>;
export const AppAbility = PureAbility as AbilityClass<AppAbility>;

export type AbilityFactory = (user: User) => AppAbility;

export abstract class BaseAbility {
  abstract createForUser(user: User): AppAbility | Promise<AppAbility>;

  protected createAbility(callback: (builder: AbilityBuilder<AppAbility>) => void): AppAbility {
    const builder = new AbilityBuilder(AppAbility);
    callback(builder);
    return builder.build();
  }

  protected async createAbilityAsync(callback: (builder: AbilityBuilder<AppAbility>) => Promise<void>): Promise<AppAbility> {
    const builder = new AbilityBuilder(AppAbility);
    await callback(builder);
    return builder.build();
  }
}
