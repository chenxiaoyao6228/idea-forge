import { createZodDto } from "nestjs-zod";
import { UpdateUserTokenLimitSchema } from "shared";

export class UpdateUserTokenLimitDto extends createZodDto(UpdateUserTokenLimitSchema) {}
