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

const BaseSubspaceSchema = z.object({
  name: z.string().min(1, "Subspace name cannot be empty").max(50, "Subspace name cannot exceed 50 characters"),
  description: z.string().max(200, "Subspace description cannot exceed 200 characters").optional().nullish(),
  avatar: z.string().optional().nullish(),
  type: z.nativeEnum(SubspaceType).default(SubspaceType.PUBLIC),
});

const SubspaceSchema = BaseSubspaceSchema.extend({
  id: z.string(),
  workspaceId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Subspace = z.infer<typeof SubspaceSchema>;

const SubspaceMemberSchema = z.object({
  id: z.string(),
  userId: z.number(),
  role: z.nativeEnum(SubspaceRole),
  createdAt: z.string(),
});
export type SubspaceMember = z.infer<typeof SubspaceMemberSchema>;

// Create subspace
export const CreateSubspaceRequestSchema = BaseSubspaceSchema.extend({
  workspaceId: z.string(),
});
export type CreateSubspaceRequest = z.infer<typeof CreateSubspaceRequestSchema>;

// Update subspace
export const UpdateSubspaceRequestSchema = BaseSubspaceSchema.partial();
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