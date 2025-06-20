import { createPrismaAbility } from "@casl/prisma";
import { AbilityBuilder, AbilityClass, PureAbility } from "@casl/ability";
import { User } from "@prisma/client";
import { ModelName } from "@casl/prisma/dist/types/prismaClientBoundTypes";

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
  abstract createForUser(user: User): Promise<AppAbility>;

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
