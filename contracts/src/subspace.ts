import { SubspaceMemberSchema, SubspaceRoleSchema, SubspaceSchema, SubspaceTypeSchema } from "./schema";
import { z } from "zod";

// Create subspace
export const CreateSubspaceRequestSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  type: SubspaceTypeSchema.default(SubspaceTypeSchema.enum.PUBLIC),
  avatar: z.string().nullable().optional(),
  workspaceId: z.string(),
  parentId: z.number().nullable().optional(),
})

export type CreateSubspaceRequest = z.infer<typeof CreateSubspaceRequestSchema>;

export const MoveSubspaceRequestSchema = z.object({
  index: z.string(),
})
export type MoveSubspaceRequest = z.infer<typeof MoveSubspaceRequestSchema>;


// Update subspace
export const UpdateSubspaceRequestSchema = SubspaceSchema.partial();
export type UpdateSubspaceRequest = z.infer<typeof UpdateSubspaceRequestSchema>;

// Add subspace member
export const AddSubspaceMemberRequestSchema = z.object({
  userId: z.number(),
  role: SubspaceRoleSchema.default(SubspaceRoleSchema.enum.MEMBER),
});
export type AddSubspaceMemberRequest = z.infer<typeof AddSubspaceMemberRequestSchema>;

// Update subspace member
export const UpdateSubspaceMemberRequestSchema = z.object({
  role: SubspaceRoleSchema
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
  total: z.number(),
});
export type SubspaceMemberListResponse = z.infer<typeof SubspaceMemberListResponseSchema>;