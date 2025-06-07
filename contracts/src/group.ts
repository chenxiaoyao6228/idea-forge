import { z } from "zod";
import { basePagerSchema } from "./_base";
import { MemberGroupSchema } from "./schema";

// Base schemas
export const groupInfoSchema = z.object({ 
  id: z.string().cuid().optional() 
});

export const groupListRequestSchema = basePagerSchema.extend({
  workspaceId: z.string().optional(),
  query: z.string().optional(),
});

export const addGroupUserSchema = z.object({ 
  id: z.string().cuid(), 
  userId: z.number() 
});

export const removeGroupUserSchema = z.object({ 
  id: z.string().cuid(), 
  userId: z.number() 
});

// Create and Update schemas
export const createGroupSchema = MemberGroupSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const updateGroupSchema = MemberGroupSchema.pick({ 
  id: true, 
  name: true, 
  description: true, 
  validUntil: true 
});

// Response schemas
export const groupResponseSchema = MemberGroupSchema.extend({
  members: z.array(z.object({
    id: z.number(),
    email: z.string(),
    displayName: z.string().nullable(),
  })),
});

export const groupInfoResponseSchema = z.object({
  data: groupResponseSchema,
});

export const groupListResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
  data: z.array(groupResponseSchema),
});

export const groupCreateResponseSchema = z.object({
  data: groupResponseSchema,
});

export const groupUpdateResponseSchema = z.object({
  data: groupResponseSchema,
});

export const groupDeleteResponseSchema = z.object({
  success: z.boolean(),
});

export const groupAddUserResponseSchema = z.object({
  success: z.boolean(),
});

export const groupRemoveUserResponseSchema = z.object({
  success: z.boolean(),
});

// Types
export type GroupInfoDto = z.infer<typeof groupInfoSchema>;
export type GroupListRequestDto = z.infer<typeof groupListRequestSchema>;
export type CreateGroupDto = z.infer<typeof createGroupSchema>;
export type UpdateGroupDto = z.infer<typeof updateGroupSchema>;
export type AddGroupUserDto = z.infer<typeof addGroupUserSchema>;
export type RemoveGroupUserDto = z.infer<typeof removeGroupUserSchema>;

export type GroupResponse = z.infer<typeof groupResponseSchema>;
export type GroupInfoResponse = z.infer<typeof groupInfoResponseSchema>;
export type GroupListResponse = z.infer<typeof groupListResponseSchema>;
export type GroupCreateResponse = z.infer<typeof groupCreateResponseSchema>;
export type GroupUpdateResponse = z.infer<typeof groupUpdateResponseSchema>;
export type GroupDeleteResponse = z.infer<typeof groupDeleteResponseSchema>;
export type GroupAddUserResponse = z.infer<typeof groupAddUserResponseSchema>;
export type GroupRemoveUserResponse = z.infer<typeof groupRemoveUserResponseSchema>;
