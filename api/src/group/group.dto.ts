import { createZodDto } from "nestjs-zod";
import { groupInfoSchema, groupListRequestSchema, createGroupSchema, updateGroupSchema, addGroupUserSchema, removeGroupUserSchema } from "contracts";

export class GroupInfoDto extends createZodDto(groupInfoSchema) {}
export class GroupListRequestDto extends createZodDto(groupListRequestSchema) {}
export class CreateGroupDto extends createZodDto(createGroupSchema) {}
export class UpdateGroupDto extends createZodDto(updateGroupSchema) {}
export class AddGroupUserDto extends createZodDto(addGroupUserSchema) {}
export class RemoveGroupUserDto extends createZodDto(removeGroupUserSchema) {}
