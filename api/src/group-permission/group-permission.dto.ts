import { createZodDto } from "nestjs-zod";
import { groupPermissionSchema, groupPermissionListRequestSchema } from "contracts";

export class GroupPermissionDto extends createZodDto(groupPermissionSchema) {}
export class GroupPermissionListRequestDto extends createZodDto(groupPermissionListRequestSchema) {}
