import { z } from "zod";
import { PermissionLevelSchema, SubspaceMemberSchema, SubspaceRoleSchema, SubspaceSchema, SubspaceTypeSchema } from "./prisma-type-generated";

// Create subspace
export const CreateSubspaceRequestSchema = z.object({
  name: z.string(),
  workspaceId: z.string(),
  description: z.string().nullable().optional(),
  type: SubspaceTypeSchema.optional(),
  avatar: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
});
export type CreateSubspaceRequest = z.infer<typeof CreateSubspaceRequestSchema>;

// Update subspace
export const UpdateSubspaceRequestSchema = SubspaceSchema.partial();
export type UpdateSubspaceRequest = z.infer<typeof UpdateSubspaceRequestSchema>;

// Add subspace member
export const AddSubspaceMemberRequestSchema = z.object({
  userId: z.string(),
  role: SubspaceRoleSchema.default(SubspaceRoleSchema.enum.MEMBER),
});
export type AddSubspaceMemberRequest = z.infer<typeof AddSubspaceMemberRequestSchema>;

// Update subspace member
export const UpdateSubspaceMemberRequestSchema = z.object({
  role: SubspaceRoleSchema,
});
export type UpdateSubspaceMemberRequest = z.infer<typeof UpdateSubspaceMemberRequestSchema>;

// Subspace list response
export const SubspaceListResponseSchema = z.object({
  subspaces: z.array(SubspaceSchema),
});
export type SubspaceListResponse = z.infer<typeof SubspaceListResponseSchema>;

// Subspace detail response
export const SubspaceDetailResponseSchema = z.object({
  subspace: SubspaceSchema.extend({
    members: z.array(SubspaceMemberSchema),
  }),
});
export type SubspaceDetailResponse = z.infer<typeof SubspaceDetailResponseSchema>;

// Subspace member list response
export const SubspaceMemberListResponseSchema = z.object({
  members: z.array(SubspaceMemberSchema),
});
export type SubspaceMemberListResponse = z.infer<typeof SubspaceMemberListResponseSchema>;

// Subspace permission response
export const SubspacePermissionResponseSchema = z.object({
  permission: PermissionLevelSchema,
});
export type SubspacePermissionResponse = z.infer<typeof SubspacePermissionResponseSchema>;

// Move subspace
export const MoveSubspaceRequestSchema = z.object({
  index: z.string(),
});
export type MoveSubspaceRequest = z.infer<typeof MoveSubspaceRequestSchema>;

// Subspace user/group permission
export const subspaceUserPermissionSchema = z.object({
  userId: z.string(),
  permission: PermissionLevelSchema,
});
export type SubspaceUserPermission = z.infer<typeof subspaceUserPermissionSchema>;

export const subspaceGroupPermissionSchema = z.object({
  groupId: z.string(),
  permission: PermissionLevelSchema,
});
export type SubspaceGroupPermission = z.infer<typeof subspaceGroupPermissionSchema>;

// Subspace user/group permission response
export const subspaceUserPermissionResponseSchema = z.object({
  data: z.array(
    subspaceUserPermissionSchema.extend({
      user: z.object({
        id: z.string(),
        email: z.string(),
        displayName: z.string().nullable(),
      }),
    }),
  ),
});
export type SubspaceUserPermissionResponse = z.infer<typeof subspaceUserPermissionResponseSchema>;

export const subspaceGroupPermissionResponseSchema = z.object({
  data: z.array(
    subspaceGroupPermissionSchema.extend({
      group: z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
      }),
    }),
  ),
});
export type SubspaceGroupPermissionResponse = z.infer<typeof subspaceGroupPermissionResponseSchema>;

// Batch set workspace-wide subspaces
export const BatchSetWorkspaceWideRequestSchema = z.object({
  subspaceIds: z.array(z.string()),
});
export type BatchSetWorkspaceWideRequest = z.infer<typeof BatchSetWorkspaceWideRequestSchema>;

export const BatchSetWorkspaceWideResponseSchema = z.object({
  success: z.boolean(),
  updatedCount: z.number(),
  subspaces: z.array(SubspaceSchema),
});
export type BatchSetWorkspaceWideResponse = z.infer<typeof BatchSetWorkspaceWideResponseSchema>;
