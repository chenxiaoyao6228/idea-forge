import { createZodDto } from "nestjs-zod";
import { addUserPermissionSchema, addGroupPermissionSchema, updatePermissionSchema, permissionListRequestSchema } from "contracts";

export class AddUserPermissionDto extends createZodDto(addUserPermissionSchema) {}
export class AddGroupPermissionDto extends createZodDto(addGroupPermissionSchema) {}
export class UpdatePermissionDto extends createZodDto(updatePermissionSchema) {}
export class PermissionListRequestDto extends createZodDto(permissionListRequestSchema) {}
