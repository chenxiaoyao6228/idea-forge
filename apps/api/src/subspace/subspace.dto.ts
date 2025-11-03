import { createZodDto } from "nestjs-zod";
import {
  AddSubspaceMemberRequestSchema,
  UpdateSubspaceMemberRequestSchema,
  MoveSubspaceRequestSchema,
  CreateSubspaceRequestSchema,
  UpdateSubspaceRequestSchema,
  BatchSetWorkspaceWideRequestSchema,
  BatchAddSubspaceMemberRequestSchema,
  UpdateSubspaceSettingsRequestSchema,
} from "@idea/contracts";

export class CreateSubspaceDto extends createZodDto(CreateSubspaceRequestSchema) {}

export class MoveSubspaceDto extends createZodDto(MoveSubspaceRequestSchema) {}

export class UpdateSubspaceDto extends createZodDto(UpdateSubspaceRequestSchema) {}

export class AddSubspaceMemberDto extends createZodDto(AddSubspaceMemberRequestSchema) {}

export class UpdateSubspaceMemberDto extends createZodDto(UpdateSubspaceMemberRequestSchema) {}

export class BatchSetWorkspaceWideDto extends createZodDto(BatchSetWorkspaceWideRequestSchema) {}

export class BatchAddSubspaceMemberDto extends createZodDto(BatchAddSubspaceMemberRequestSchema) {}

export class UpdateSubspaceSettingsDto extends createZodDto(UpdateSubspaceSettingsRequestSchema) {}
