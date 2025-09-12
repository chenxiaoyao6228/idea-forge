import { createZodDto } from "nestjs-zod";
import { createStarSchema, updateStarSchema, listStarSchema } from "@idea/contracts";

export class CreateStarDto extends createZodDto(createStarSchema) {}
export class UpdateStarDto extends createZodDto(updateStarSchema) {}
export class ListStarDto extends createZodDto(listStarSchema) {}
