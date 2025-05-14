import { SubspaceMemberSchema, SubspaceSchema } from "../schema";
import { z } from "zod";

export enum SubspaceRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum SubspaceType {
  WORKSPACE_WIDE = 'WORKSPACE_WIDE',// global
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  INVITE_ONLY = 'INVITE_ONLY'
}

// Create subspace
export const CreateSubspaceRequestSchema = SubspaceSchema.extend({
  workspaceId: z.string(),
  type: z.nativeEnum(SubspaceType).default(SubspaceType.PUBLIC) // default to public ty
})

export type CreateSubspaceRequest = z.infer<typeof CreateSubspaceRequestSchema>;

// Update subspace
export const UpdateSubspaceRequestSchema = SubspaceSchema.partial();
export type UpdateSubspaceRequest = z.infer<typeof UpdateSubspaceRequestSchema>;

// Add subspace member
export const AddSubspaceMemberRequestSchema = z.object({
  userId: z.number(),
  role: z.nativeEnum(SubspaceRole).default(SubspaceRole.MEMBER),
});
export type AddSubspaceMemberRequest = z.infer<typeof AddSubspaceMemberRequestSchema>;

// Update subspace member
export const UpdateSubspaceMemberRequestSchema = z.object({
  role: z.nativeEnum(SubspaceRole),
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