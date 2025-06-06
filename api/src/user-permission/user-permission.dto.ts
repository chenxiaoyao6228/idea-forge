import { createZodDto } from "nestjs-zod";
import { userPermissionListRequestSchema, userPermissionSchema } from "contracts";

export class UserPermissionListDto extends createZodDto(userPermissionListRequestSchema) {}

export class CreateUserPermissionDto extends createZodDto(userPermissionSchema) {}
