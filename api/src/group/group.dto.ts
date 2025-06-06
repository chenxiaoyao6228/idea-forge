import { createZodDto } from "nestjs-zod";
import { MemberGroupSchema } from "contracts/src/schema/modelSchema/MemberGroupSchema";
import { z } from "zod";

export const groupInfoSchema = z.object({ id: z.string().cuid().optional() });
export const groupListRequestSchema = z.object({
  workspaceId: z.string().optional(),
  query: z.string().optional(),
  page: z.number().optional(),
  limit: z.number().optional(),
});
export const addGroupUserSchema = z.object({ id: z.string().cuid(), userId: z.number() });
export const removeGroupUserSchema = z.object({ id: z.string().cuid(), userId: z.number() });

export class GroupInfoDto extends createZodDto(groupInfoSchema) {}
export class GroupListRequestDto extends createZodDto(groupListRequestSchema) {}
export class CreateGroupDto extends createZodDto(MemberGroupSchema.omit({ id: true, createdAt: true, updatedAt: true })) {}
export class UpdateGroupDto extends createZodDto(MemberGroupSchema.pick({ id: true, name: true, description: true, validUntil: true })) {}
export class AddGroupUserDto extends createZodDto(addGroupUserSchema) {}
export class RemoveGroupUserDto extends createZodDto(removeGroupUserSchema) {}
