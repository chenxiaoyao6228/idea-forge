import { z } from "zod";
import { basePagerSchema } from "./_base";
import { PermissionLevelSchema, GuestStatusSchema } from "./prisma-type-generated";

// Request schemas
export const inviteGuestSchema = z.object({
  documentId: z.string().cuid(),
  email: z.string().email(),
  permission: PermissionLevelSchema,
});

export const inviteGuestToWorkspaceSchema = z.object({
  workspaceId: z.string().cuid(),
  email: z.string().email(),
  name: z.string().optional(),
});

export const batchInviteGuestsSchema = z.object({
  documentId: z.string().cuid(),
  guests: z.array(
    z.object({
      guestId: z.string(),
      permission: PermissionLevelSchema,
    }),
  ),
});

export const updateGuestPermissionSchema = z.object({
  documentId: z.string().cuid(),
  permission: PermissionLevelSchema,
});

export const getWorkspaceGuestsSchema = basePagerSchema.extend({
  workspaceId: z.string().cuid(),
});

// Response schemas
export const guestCollaboratorResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  status: GuestStatusSchema,
  expireAt: z.date(),
  lastVisitedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  invitedBy: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string().nullable(),
  }),
  permission: PermissionLevelSchema.optional(), // Effective permission for the document
  isInherited: z.boolean().optional(), // Flag indicating inherited-only permission (no direct permission)
  hasParentPermission: z.boolean().optional(), // Flag indicating override (has both direct and inherited)
  permissionSource: z
    .object({
      source: z.enum(["direct", "inherited"]),
      sourceDocId: z.string().optional(),
      sourceDocTitle: z.string().optional(),
      level: PermissionLevelSchema.optional(),
    })
    .optional(), // Current permission source metadata
  parentPermissionSource: z
    .object({
      source: z.literal("inherited"),
      sourceDocId: z.string().optional(),
      sourceDocTitle: z.string().optional(),
      level: PermissionLevelSchema.optional(),
    })
    .optional(), // Parent permission source (for overrides)
  documents: z.array(
    z.object({
      documentId: z.string(),
      documentTitle: z.string(),
      permission: PermissionLevelSchema,
      createdAt: z.date(),
    }),
  ),
});

export const workspaceGuestsResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
  data: z.array(guestCollaboratorResponseSchema),
});

export const removeGuestFromDocumentSchema = z.object({
  documentId: z.string().cuid(),
});

export const promoteGuestToMemberSchema = z.object({
  role: z.enum(["MEMBER", "ADMIN"]).optional().default("MEMBER"),
});

// Type exports
export type InviteGuestRequest = z.infer<typeof inviteGuestSchema>;
export type InviteGuestToWorkspaceRequest = z.infer<typeof inviteGuestToWorkspaceSchema>;
export type BatchInviteGuestsRequest = z.infer<typeof batchInviteGuestsSchema>;
export type UpdateGuestPermissionRequest = z.infer<typeof updateGuestPermissionSchema>;
export type GetWorkspaceGuestsRequest = z.infer<typeof getWorkspaceGuestsSchema>;
export type RemoveGuestFromDocumentRequest = z.infer<typeof removeGuestFromDocumentSchema>;
export type PromoteGuestToMemberRequest = z.infer<typeof promoteGuestToMemberSchema>;
export type PromoteGuestToMemberResponse = { message: string };
export type GuestCollaboratorResponse = z.infer<typeof guestCollaboratorResponseSchema>;
export type WorkspaceGuestsResponse = z.infer<typeof workspaceGuestsResponseSchema>;
