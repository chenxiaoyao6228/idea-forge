import { createZodDto } from "nestjs-zod";
import { UpdateUserTokenLimitRequestSchema } from "shared";

export class UpdateUserTokenLimitDto extends createZodDto(UpdateUserTokenLimitRequestSchema) {}
