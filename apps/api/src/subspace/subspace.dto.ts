import { createZodDto } from "nestjs-zod";
import {
  AddSubspaceMemberRequestSchema,
  UpdateSubspaceMemberRequestSchema,
  MoveSubspaceRequestSchema,
  CreateSubspaceRequestSchema,
  UpdateSubspaceRequestSchema,
} from "@idea/contracts";

export class CreateSubspaceDto extends createZodDto(CreateSubspaceRequestSchema) {}

export class MoveSubspaceDto extends createZodDto(MoveSubspaceRequestSchema) {}

export class UpdateSubspaceDto extends createZodDto(UpdateSubspaceRequestSchema) {}

export class AddSubspaceMemberDto extends createZodDto(AddSubspaceMemberRequestSchema) {}

export class UpdateSubspaceMemberDto extends createZodDto(UpdateSubspaceMemberRequestSchema) {}
