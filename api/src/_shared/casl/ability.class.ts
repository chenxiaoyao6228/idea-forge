import { AbilityBuilder, AbilityClass, PureAbility } from "@casl/ability";
import { ModelName } from "@/_shared/database/prisma/prisma.extension";
import { User } from "@prisma/client";

export enum Action {
  // Basic CRUD operations
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
  Manage = "manage", // highest permission

  // Permission management operations, for document and subspace, workspace, group, and etc
  ManagePermissions = "managePermissions",
  ViewPermissions = "viewPermissions",

  // Workspace/Subspace operations
  InviteMember = "inviteMember",
  RemoveMember = "removeMember",
  ManageMembers = "manageMembers",
  ViewMembers = "viewMembers",

  // Workspace operations
  ManageWorkspaceSettings = "manageWorkspaceSettings",
  TransferOwnership = "transferOwnership",
  ManageSubspaces = "manageSubspaces",

  // Subspace operations
  ManageSubspaceSettings = "manageSubspaceSettings",
  ManageNavigationTree = "manageNavigationTree",

  // Document specific operations
  Comment = "comment",
  Edit = "edit",
  Share = "share",
  Move = "move",
  BulkMove = "bulkMove", // need MANAGE permission
  BulkDelete = "bulkDelete", // need MANAGE permission
  BulkShare = "bulkShare", // need SHARE permission
  BulkExport = "bulkExport", // need READ permission

  // Import and export operations
  Export = "export",
  Import = "import",
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
