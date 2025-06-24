import { CreateUserRequestSchema, UpdateUserRequestSchema } from "@idea/contracts";
import { createZodDto } from "nestjs-zod";

export class CreateUserDto extends createZodDto(CreateUserRequestSchema) {}
export class UpdateUserDto extends createZodDto(UpdateUserRequestSchema) {}
