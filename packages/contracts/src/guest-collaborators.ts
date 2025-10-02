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

// Type exports
export type InviteGuestRequest = z.infer<typeof inviteGuestSchema>;
export type InviteGuestToWorkspaceRequest = z.infer<typeof inviteGuestToWorkspaceSchema>;
export type BatchInviteGuestsRequest = z.infer<typeof batchInviteGuestsSchema>;
export type UpdateGuestPermissionRequest = z.infer<typeof updateGuestPermissionSchema>;
export type GetWorkspaceGuestsRequest = z.infer<typeof getWorkspaceGuestsSchema>;
export type RemoveGuestFromDocumentRequest = z.infer<typeof removeGuestFromDocumentSchema>;
export type GuestCollaboratorResponse = z.infer<typeof guestCollaboratorResponseSchema>;
export type WorkspaceGuestsResponse = z.infer<typeof workspaceGuestsResponseSchema>;
