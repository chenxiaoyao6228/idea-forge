import z from "zod";
import { createZodDto } from "nestjs-zod";
import { CreateWorkspaceRequestSchema, UpdateWorkspaceRequestSchema } from "contracts";

export class CreateWorkspaceDto extends createZodDto(CreateWorkspaceRequestSchema) {}

export class UpdateWorkspaceDto extends createZodDto(UpdateWorkspaceRequestSchema) {}
