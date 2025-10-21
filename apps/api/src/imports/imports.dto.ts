import { createZodDto } from "nestjs-zod";
import { PrepareImportRequestSchema, StartImportRequestSchema } from "@idea/contracts";

// Use schemas from contracts package for API validation
export class PrepareImportDto extends createZodDto(PrepareImportRequestSchema) {}

export class StartImportDto extends createZodDto(StartImportRequestSchema) {}

// BullMQ job data (internal, not exposed via API)
export interface ImportJobData {
  importJobId: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  workspaceId: string;
  subspaceId: string;
  title: string;
  userId: string;
}
