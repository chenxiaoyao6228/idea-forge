import { createZodDto } from "nestjs-zod";
import { UpdateUserTokenLimitRequestSchema } from "contracts";

export class UpdateUserTokenLimitDto extends createZodDto(UpdateUserTokenLimitRequestSchema) {}
