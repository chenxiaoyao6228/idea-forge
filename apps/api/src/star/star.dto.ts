import { createZodDto } from "nestjs-zod";
import { createStarSchema, updateStarSchema } from "@idea/contracts";

export class CreateStarDto extends createZodDto(createStarSchema) {}
export class UpdateStarDto extends createZodDto(updateStarSchema) {}
