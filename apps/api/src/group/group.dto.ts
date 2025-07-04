import { createZodDto } from "nestjs-zod";
import { groupListRequestSchema, createGroupSchema, updateGroupSchema, addGroupUserSchema, removeGroupUserSchema } from "@idea/contracts";

export class GroupListRequestDto extends createZodDto(groupListRequestSchema) {}
export class CreateGroupDto extends createZodDto(createGroupSchema) {}
export class UpdateGroupDto extends createZodDto(updateGroupSchema) {}
export class AddGroupUserDto extends createZodDto(addGroupUserSchema) {}
export class RemoveGroupUserDto extends createZodDto(removeGroupUserSchema) {}
