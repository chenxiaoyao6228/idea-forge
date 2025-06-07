import { createZodDto } from "nestjs-zod";
import { userPermissionListRequestSchema, userPermissionSchema, updateUserPermissionIndexSchema } from "contracts";

export class UserPermissionListDto extends createZodDto(userPermissionListRequestSchema) {}

export class CreateUserPermissionDto extends createZodDto(userPermissionSchema) {}

export class UpdateUserPermissionIndexDto extends createZodDto(updateUserPermissionIndexSchema) {}
