import { createZodDto } from "nestjs-zod";
import { groupPermissionListRequestSchema, groupPermissionSchema } from "contracts";

export class GroupPermissionListDto extends createZodDto(groupPermissionListRequestSchema) {}

export class CreateGroupPermissionDto extends createZodDto(groupPermissionSchema) {}
