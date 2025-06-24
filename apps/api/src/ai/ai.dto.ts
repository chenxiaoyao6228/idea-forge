import { createZodDto } from "nestjs-zod";
import { UpdateUserTokenLimitRequestSchema } from "@idea/contracts";

export class UpdateUserTokenLimitDto extends createZodDto(UpdateUserTokenLimitRequestSchema) {}
