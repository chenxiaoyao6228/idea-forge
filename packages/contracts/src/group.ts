import { z } from "zod";
import { basePagerSchema } from "./_base";
import { MemberGroupSchema } from "./prisma-type-generated";

export const groupListRequestSchema = basePagerSchema.merge(
  z.object({
    workspaceId: z.string().optional(),
    query: z.string().optional(),
  }),
);
export type GroupListRequestDto = z.infer<typeof groupListRequestSchema>;

export const createGroupSchema = MemberGroupSchema.omit({ id: true, createdAt: true, updatedAt: true, validUntil: true });
export type CreateGroupDto = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = MemberGroupSchema.pick({ id: true, name: true, description: true, validUntil: true });
export type UpdateGroupDto = z.infer<typeof updateGroupSchema>;

export const addGroupUserSchema = z.object({ id: z.string(), userId: z.string() });
export type AddGroupUserDto = z.infer<typeof addGroupUserSchema>;

export const removeGroupUserSchema = z.object({ id: z.string(), userId: z.string() });
export type RemoveGroupUserDto = z.infer<typeof removeGroupUserSchema>;

export const groupInfoResponseSchema = z.object({
  data: MemberGroupSchema,
});
export type GroupInfoResponse = z.infer<typeof groupInfoResponseSchema>;

export const groupListResponseSchema = z.object({
  data: z.array(MemberGroupSchema),
  pagination: basePagerSchema,
  abilities: z.object({
    canCreate: z.boolean(),
    canUpdate: z.boolean(),
    canDelete: z.boolean(),
  }),
});
export type GroupListResponse = z.infer<typeof groupListResponseSchema>;

export const groupCreateResponseSchema = z.object({
  data: MemberGroupSchema,
});
export type GroupCreateResponse = z.infer<typeof groupCreateResponseSchema>;

export const groupUpdateResponseSchema = z.object({
  data: MemberGroupSchema,
});
export type GroupUpdateResponse = z.infer<typeof groupUpdateResponseSchema>;

export const groupAddUserResponseSchema = z.object({
  data: MemberGroupSchema,
});
export type GroupAddUserResponse = z.infer<typeof groupAddUserResponseSchema>;

export const groupRemoveUserResponseSchema = z.object({ success: z.boolean() });
export type GroupRemoveUserResponse = z.infer<typeof groupRemoveUserResponseSchema>;

export const groupDeleteResponseSchema = z.object({ success: z.boolean() });
export type GroupDeleteResponse = z.infer<typeof groupDeleteResponseSchema>;
