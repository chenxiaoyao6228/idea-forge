import type { RawRule } from "@casl/ability";
import type { PackRule } from "@casl/ability/extra";
import { z } from "zod";

// Shared enumerations for CASL actions across API and client
export enum AbilityAction {
  // Basic CRUD operations
  Manage = "manage", // highest permission
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",

  // Cross-cutting document operations
  Share = "share",
  Comment = "comment",
  Move = "move",
  Export = "export",
  Import = "import",

  // Document lifecycle operations
  Archive = "archive",
  Restore = "restore",
  Publish = "publish",
  Unpublish = "unpublish",

  // Membership & permission management
  ManageMembers = "manageMembers",
  ViewMembers = "viewMembers",
  ManagePermissions = "managePermissions",

  // Workspace/Subspace configuration
  ManageSettings = "manageSettings",
  ManageStructure = "manageStructure",
  ManageSubspaces = "manageSubspaces",
  TransferOwnership = "transferOwnership",
}

export const AbilityActionSchema = z.nativeEnum(AbilityAction);

// Allow consumers to continue importing `Action` for backwards compatibility
export const Action = AbilityAction;
export type Action = AbilityAction;

// CASL subjects map to Prisma model names or "all"
export type AbilitySubject = string;
export const AbilitySubjectSchema = z.string().min(1);

export type SerializedAbilityRule = PackRule<RawRule<any, any>>;

export const SerializedAbilitySchema = z.object({
  subject: AbilitySubjectSchema,
  rules: z.array(z.any()),
});

export type SerializedAbility = z.infer<typeof SerializedAbilitySchema>;

export type SerializedAbilityMap = Record<AbilitySubject, SerializedAbility>;
