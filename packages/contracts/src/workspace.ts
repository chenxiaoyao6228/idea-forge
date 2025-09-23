import { z } from "zod";

import { WorkspaceMemberSchema, WorkspaceRoleSchema, WorkspaceSchema } from "./prisma-type-generated";

// Workspace Settings Schema - scalable structure for future settings
export const WorkspaceSettingsSchema = z.object({
  // Appearance settings
  timezone: z.string().optional(), // IANA timezone string e.g., "America/New_York"
  dateFormat: z.enum(["YYYY/MM/DD", "MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "DD-MM-YYYY", "MM-DD-YYYY"]).optional(),
});
export type WorkspaceSettings = z.infer<typeof WorkspaceSettingsSchema>;

// Workspace types
export const WorkspaceTypeEnumSchema = z.enum(["PERSONAL", "TEAM"]);
export type WorkspaceTypeEnum = z.infer<typeof WorkspaceTypeEnumSchema>;

// Export enum values for runtime use
export const WorkspaceTypeEnum = {
  PERSONAL: "PERSONAL" as const,
  TEAM: "TEAM" as const,
};

// Create workspace
export const CreateWorkspaceRequestSchema = WorkspaceSchema.pick({
  name: true,
  description: true,
  avatar: true,
}).extend({
  type: WorkspaceTypeEnumSchema,
});
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;

// Update workspace - now with proper settings validation
export const UpdateWorkspaceRequestSchema = WorkspaceSchema.pick({
  name: true,
  description: true,
  avatar: true,
  memberSubspaceCreate: true,
}).extend({
  settings: WorkspaceSettingsSchema.optional(),
});
export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceRequestSchema>;

export const UpdateWorkspaceMemberResponseSchema = z.object({
  member: WorkspaceMemberSchema,
});
export type UpdateWorkspaceMemberResponse = z.infer<typeof UpdateWorkspaceMemberResponseSchema>;

// ===================================================================================================

// Add workspace member
export const AddWorkspaceMemberRequestSchema = z.object({
  userId: z.string(),
  role: WorkspaceRoleSchema,
});
export type AddWorkspaceMemberRequest = z.infer<typeof AddWorkspaceMemberRequestSchema>;

// Batch add workspace members request
export const BatchAddWorkspaceMemberRequestSchema = z.object({
  items: z.array(
    z.object({
      userId: z.string(),
      role: WorkspaceRoleSchema.default(WorkspaceRoleSchema.enum.MEMBER),
    }),
  ),
});
export type BatchAddWorkspaceMemberRequest = z.infer<typeof BatchAddWorkspaceMemberRequestSchema>;

// Batch add workspace members response
export const BatchAddWorkspaceMemberResponseSchema = z.object({
  success: z.boolean(),
  addedCount: z.number(),
  skippedCount: z.number(),
  errors: z.array(
    z.object({
      userId: z.string(),
      error: z.string(),
    }),
  ),
  skipped: z.array(
    z.object({
      userId: z.string(),
      reason: z.string(),
    }),
  ),
});
export type BatchAddWorkspaceMemberResponse = z.infer<typeof BatchAddWorkspaceMemberResponseSchema>;

export const UpdateWorkspaceMemberRequestSchema = z.object({
  role: WorkspaceRoleSchema,
});
export type UpdateWorkspaceMemberRequest = z.infer<typeof UpdateWorkspaceMemberRequestSchema>;

export const WorkspaceListResponseSchema = z.array(WorkspaceSchema);
export type WorkspaceListResponse = z.infer<typeof WorkspaceListResponseSchema>;

export const WorkspaceDetailResponseSchema = WorkspaceSchema.extend({
  members: z.array(WorkspaceMemberSchema),
  subspaces: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
});

export type WorkspaceDetailResponse = z.infer<typeof WorkspaceDetailResponseSchema>;

export const WorkspaceMemberListResponseSchema = z.array(
  WorkspaceMemberSchema.extend({
    user: z.object({
      id: z.string(),
      email: z.string(),
      displayName: z.string().nullable(),
      imageUrl: z.string().nullable(),
    }),
  }),
);
export type WorkspaceMemberListResponse = z.infer<typeof WorkspaceMemberListResponseSchema>;

export const WorkspacePublicInviteLinkSchema = z.object({
  workspaceId: z.string(),
  token: z.string(),
  url: z.string(),
  expiresAt: z.string(),
});
export type WorkspacePublicInviteLink = z.infer<typeof WorkspacePublicInviteLinkSchema>;

export const WorkspacePublicInvitationStatusSchema = z.object({
  status: z.enum(["active", "expired", "invalid"]),
  workspaceId: z.string().optional(),
  workspaceName: z.string().optional(),
  workspaceAvatar: z.string().nullable().optional(),
  expiresAt: z.string().optional(),
  alreadyMember: z.boolean().optional(),
  token: z.string().optional(),
});
export type WorkspacePublicInvitationStatus = z.infer<typeof WorkspacePublicInvitationStatusSchema>;

export const AcceptWorkspaceInvitationResponseSchema = z.object({
  workspaceId: z.string(),
  alreadyMember: z.boolean(),
});
export type AcceptWorkspaceInvitationResponse = z.infer<typeof AcceptWorkspaceInvitationResponseSchema>;

// Workspace Settings API responses
export const WorkspaceSettingsResponseSchema = WorkspaceSettingsSchema;
export type WorkspaceSettingsResponse = z.infer<typeof WorkspaceSettingsResponseSchema>;

export const TimezoneOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const DateFormatOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  description: z.string(),
});

export const WorkspaceSettingsOptionsResponseSchema = z.object({
  timezones: z.array(TimezoneOptionSchema),
  dateFormats: z.array(DateFormatOptionSchema),
});
export type WorkspaceSettingsOptionsResponse = z.infer<typeof WorkspaceSettingsOptionsResponseSchema>;
