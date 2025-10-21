import { z } from "zod";

// ==================== Import Request/Response Schemas ====================

export const PrepareImportRequestSchema = z.object({
  fileName: z.string().min(1, "File name is required"),
  mimeType: z.string().min(1, "MIME type is required"),
  workspaceId: z.string().cuid("Invalid workspace ID"),
  subspaceId: z.string().cuid("Invalid subspace ID"),
  parentId: z.string().cuid("Invalid parent ID").nullable(),
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

export const ImportStatusResponseSchema = z.object({
  importJobId: z.string(),
  status: z.enum(["pending", "processing", "uploading", "downloading", "converting", "processing_images", "creating_document", "saving", "complete", "failed"]),
  progress: z.number().min(0).max(100),
  message: z.string(),
  // Only present when complete
  docId: z.string().cuid().optional(),
  title: z.string().optional(),
  // Only present when failed
  error: z.string().optional(),
});

// ==================== Type Exports ====================

export type PrepareImportRequest = z.infer<typeof PrepareImportRequestSchema>;
export type PrepareImportResponse = z.infer<typeof PrepareImportResponseSchema>;
export type StartImportRequest = z.infer<typeof StartImportRequestSchema>;
export type StartImportResponse = z.infer<typeof StartImportResponseSchema>;
export type ImportStatusResponse = z.infer<typeof ImportStatusResponseSchema>;
