import type { RawRule } from "@casl/ability";
import type { PackRule } from "@casl/ability/extra";
import { z } from "zod";

// Shared enumerations for CASL actions across API and client
export enum AbilityAction {
  // Basic CRUD operations
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",
  Manage = "manage", // highest permission

  // Permission management operations for workspace, subspace, document, etc.
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
  BulkMove = "bulkMove",
  BulkDelete = "bulkDelete",
  BulkShare = "bulkShare",
  BulkExport = "bulkExport",

  // Import and export operations
  Export = "export",
  Import = "import",
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
