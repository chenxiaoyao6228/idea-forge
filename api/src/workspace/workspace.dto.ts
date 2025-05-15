import z from "zod";
import { createZodDto } from "nestjs-zod";
import { CreateWorkspaceRequestSchema, UpdateWorkspaceRequestSchema, SwitchWorkspaceSchema } from "contracts";

export class CreateWorkspaceDto extends createZodDto(
  z.object({
    avatar: z.string().optional(),
    name: z.string(),
    description: z.string().optional(),
  }),
) {}

export class UpdateWorkspaceDto extends createZodDto(UpdateWorkspaceRequestSchema) {}

export class SwitchWorkspaceDto extends createZodDto(SwitchWorkspaceSchema) {}
