import { CreateUserRequestSchema, UpdateUserRequestSchema } from "contracts";
import { createZodDto } from "nestjs-zod";

export class CreateUserDto extends createZodDto(CreateUserRequestSchema) {}
export class UpdateUserDto extends createZodDto(UpdateUserRequestSchema) {}
