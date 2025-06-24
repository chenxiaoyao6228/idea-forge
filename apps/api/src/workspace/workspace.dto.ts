import z from "zod";
import { createZodDto } from "nestjs-zod";
import { CreateWorkspaceRequestSchema, UpdateWorkspaceRequestSchema } from "@idea/contracts";

export class CreateWorkspaceDto extends createZodDto(CreateWorkspaceRequestSchema) {}

export class UpdateWorkspaceDto extends createZodDto(UpdateWorkspaceRequestSchema) {}
