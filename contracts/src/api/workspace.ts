import { WorkspaceMemberSchema, WorkspaceOptionalDefaultsSchema, WorkspaceSchema, WorkspaceRoleSchema  } from "../schema";

import { z } from "zod";

// Create workspace
export const CreateWorkspaceRequestSchema = WorkspaceOptionalDefaultsSchema;
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;

// Update workspace
export const UpdateWorkspaceRequestSchema = WorkspaceOptionalDefaultsSchema
export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceRequestSchema>;

export const UpdateWorkspaceMemberResponseSchema = z.object({
  member: WorkspaceMemberSchema,
});
export type UpdateWorkspaceMemberResponse = z.infer<typeof UpdateWorkspaceMemberResponseSchema>;

// ===================================================================================================

// Add workspace member
export const AddWorkspaceMemberRequestSchema = z.object({
  userId: z.number(),
  role: WorkspaceRoleSchema,
});
export type AddWorkspaceMemberRequest = z.infer<typeof AddWorkspaceMemberRequestSchema>;

export const UpdateWorkspaceMemberRequestSchema = z.object({
  role: WorkspaceRoleSchema
});
export type UpdateWorkspaceMemberRequest = z.infer<typeof UpdateWorkspaceMemberRequestSchema>;

export const WorkspaceListResponseSchema =  z.array(WorkspaceSchema);
export type WorkspaceListResponse = z.infer<typeof WorkspaceListResponseSchema>;

export const WorkspaceDetailResponseSchema = WorkspaceSchema.extend({
    members: z.array(WorkspaceMemberSchema),
    subspaces: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }))});

export type WorkspaceDetailResponse = z.infer<typeof WorkspaceDetailResponseSchema>;

export const WorkspaceMemberListResponseSchema = z.object({
  members: z.array(WorkspaceMemberSchema),
  total: z.number(),
});
export type WorkspaceMemberListResponse = z.infer<typeof WorkspaceMemberListResponseSchema>;

export const SwitchWorkspaceSchema = z.object({
  workspaceId: z.string(),
})
export type SwitchWorkspaceRequest = z.infer<typeof SwitchWorkspaceSchema>;