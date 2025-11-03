import { createZodDto } from "nestjs-zod";
import {
  getOrCreatePublicShareSchema,
  updatePublicShareSchema,
  listPublicSharesSchema,
} from "@idea/contracts";

export class GetOrCreateShareDto extends createZodDto(getOrCreatePublicShareSchema) {}
export class UpdateShareDto extends createZodDto(updatePublicShareSchema) {}
export class ListSharesDto extends createZodDto(listPublicSharesSchema) {}

// Revoke DTO is simple enough to not need a Zod schema
export interface RevokeShareDto {
  id: string;
}
