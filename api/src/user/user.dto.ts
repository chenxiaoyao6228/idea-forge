import { UpdateUserRequestSchema } from "contracts";
import { createZodDto } from "nestjs-zod";

export class UpdateUserDto extends createZodDto(UpdateUserRequestSchema) {}
