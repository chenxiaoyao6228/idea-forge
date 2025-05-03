import { z } from "zod";

export enum WorkspaceRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

const BaseWorkspaceSchema = z.object({
  name: z.string().min(1, "工作空间名称不能为空").max(50, "工作空间名称不能超过50个字符"),
  description: z.string().max(200, "工作空间描述不能超过200个字符").optional().nullish(),
  avatar: z.string().optional().nullish(),
});

const WorkspaceSchema = BaseWorkspaceSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),

});
export type Workspace = z.infer<typeof WorkspaceSchema>;

const WorkspaceMemberSchema = z.object({
  id: z.string(),
  userId: z.number(),
  role: z.nativeEnum(WorkspaceRole),
  createdAt: z.string(),
});
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

// Create workspace
export const CreateWorkspaceRequestSchema = BaseWorkspaceSchema;
export type CreateWorkspaceRequest = z.infer<typeof CreateWorkspaceRequestSchema>;

// Update workspace
export const UpdateWorkspaceRequestSchema = BaseWorkspaceSchema.partial();
export type UpdateWorkspaceRequest = z.infer<typeof UpdateWorkspaceRequestSchema>;

export const UpdateWorkspaceMemberResponseSchema = z.object({
  member: WorkspaceMemberSchema,
});
export type UpdateWorkspaceMemberResponse = z.infer<typeof UpdateWorkspaceMemberResponseSchema>;

// ===================================================================================================

// Add workspace member
export const AddWorkspaceMemberRequestSchema = z.object({
  userId: z.number(),
  role: z.nativeEnum(WorkspaceRole),
});
export type AddWorkspaceMemberRequest = z.infer<typeof AddWorkspaceMemberRequestSchema>;

export const UpdateWorkspaceMemberRequestSchema = z.object({
  role: z.nativeEnum(WorkspaceRole),
});
export type UpdateWorkspaceMemberRequest = z.infer<typeof UpdateWorkspaceMemberRequestSchema>;

export const WorkspaceListResponseSchema = z.object({
  workspaces: z.array(WorkspaceSchema),
  currentWorkspaceId: z.string()
});
export type WorkspaceListResponse = z.infer<typeof WorkspaceListResponseSchema>;

export const WorkspaceDetailResponseSchema = z.object({
  workspace: WorkspaceSchema.extend({
    members: z.array(WorkspaceMemberSchema),
    subspaces: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        createdAt: z.string(),
        updatedAt: z.string(),
      }),
    ),
  }),
});
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