import { z } from "zod";

// ==================== Import Request/Response Schemas ====================

export const PrepareImportRequestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  workspaceId: z.string().cuid("Invalid workspace ID"),
  subspaceId: z.string().cuid("Invalid subspace ID"),
  title: z.string().min(1, "Document title is required"),
});

export const PrepareImportResponseSchema = z.object({
  uploadUrl: z.string().url("Invalid upload URL"),
  fileKey: z.string().min(1, "File key is required"),
  importJobId: z.string().min(1, "Import job ID is required"),
});

export const StartImportRequestSchema = z.object({
  importJobId: z.string().min(1, "Import job ID is required"),
  fileKey: z.string().min(1, "File key is required"),
});

export const StartImportResponseSchema = z.object({
  jobId: z.string().min(1, "Job ID is required"),
  importJobId: z.string().min(1, "Import job ID is required"),
  message: z.string(),
});

// ==================== WebSocket Event Schemas ====================

export const ImportProgressEventSchema = z.object({
  importJobId: z.string(),
  status: z.enum(["uploading", "downloading", "converting", "processing_images", "creating_document", "saving", "complete"]),
  progress: z.number().min(0).max(100),
  message: z.string(),
});

export const ImportCompleteEventSchema = z.object({
  importJobId: z.string(),
  docId: z.string().cuid(),
  title: z.string(),
});

export const ImportErrorEventSchema = z.object({
  importJobId: z.string(),
  error: z.string(),
});

// ==================== Type Exports ====================

export type PrepareImportRequest = z.infer<typeof PrepareImportRequestSchema>;
export type PrepareImportResponse = z.infer<typeof PrepareImportResponseSchema>;
export type StartImportRequest = z.infer<typeof StartImportRequestSchema>;
export type StartImportResponse = z.infer<typeof StartImportResponseSchema>;
export type ImportProgressEvent = z.infer<typeof ImportProgressEventSchema>;
export type ImportCompleteEvent = z.infer<typeof ImportCompleteEventSchema>;
export type ImportErrorEvent = z.infer<typeof ImportErrorEventSchema>;
