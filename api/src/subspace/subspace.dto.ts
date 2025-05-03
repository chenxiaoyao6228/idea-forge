import { createZodDto } from "nestjs-zod";
import { CreateSubspaceRequestSchema, UpdateSubspaceRequestSchema, AddSubspaceMemberRequestSchema, UpdateSubspaceMemberRequestSchema } from "contracts";

export class CreateSubspaceDto extends createZodDto(CreateSubspaceRequestSchema) {}

export class UpdateSubspaceDto extends createZodDto(UpdateSubspaceRequestSchema) {}

export class AddSubspaceMemberDto extends createZodDto(AddSubspaceMemberRequestSchema) {}

export class UpdateSubspaceMemberDto extends createZodDto(UpdateSubspaceMemberRequestSchema) {}
