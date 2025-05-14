import { createZodDto } from "nestjs-zod";
import { AddSubspaceMemberRequestSchema, UpdateSubspaceMemberRequestSchema, SubspaceOptionalDefaultsSchema } from "contracts";

export class CreateSubspaceDto extends createZodDto(SubspaceOptionalDefaultsSchema) {}

export class UpdateSubspaceDto extends createZodDto(SubspaceOptionalDefaultsSchema) {}

export class AddSubspaceMemberDto extends createZodDto(AddSubspaceMemberRequestSchema) {}

export class UpdateSubspaceMemberDto extends createZodDto(UpdateSubspaceMemberRequestSchema) {}
