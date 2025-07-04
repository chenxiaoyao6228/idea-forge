import { z } from "zod";

import { WorkspaceMemberSchema, WorkspaceRoleSchema, WorkspaceSchema } from "./prisma-type-generated";

// Create workspace
export const CreateWorkspaceRequestSchema = WorkspaceSchema.pick({
  name: true,
  description: true,
  avatar: true,
});
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;

// Update workspace
export const UpdateWorkspaceRequestSchema = WorkspaceSchema.pick({
  name: true,
  description: true,
  avatar: true,
  settings: true,
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

export const WorkspaceMemberListResponseSchema = z.object({
  members: z.array(WorkspaceMemberSchema),
  total: z.number(),
});
export type WorkspaceMemberListResponse = z.infer<typeof WorkspaceMemberListResponseSchema>;
