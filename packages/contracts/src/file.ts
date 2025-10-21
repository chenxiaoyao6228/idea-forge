import { z } from "zod";

// FileContext enum values as Zod enum (simplified to 3 contexts)
export const FileContextSchema = z.enum([
  "system", // System assets (admin-only)
  "user", // User uploads (avatars, temp files, general)
  "document", // Document content (covers, attachments, imports)
]);
export type FileContextType = z.infer<typeof FileContextSchema>;

export const UploadCredentialsRequestSchema = z.object({
  fileName: z.string(),
  ext: z.string(),
  context: FileContextSchema.optional().default("user"), // Default to user context
});
export type UploadCredentialsRequest = z.infer<typeof UploadCredentialsRequestSchema>;

export const UploadCredentialsResponseSchema = z.object({
  credentials: z.object({
    url: z.string(),
    headers: z.record(z.string()),
  }),
  fileKey: z.string(),
  fileId: z.string(),
  downloadUrl: z.string(),
});

export type UploadCredentialsResponse = z.infer<typeof UploadCredentialsResponseSchema>;

// ================================

export const ConfirmUploadRequestSchema = z.object({
  fileKey: z.string(),
  fileId: z.string(),
});
export type ConfirmUploadRequest = z.infer<typeof ConfirmUploadRequestSchema>;

export const ConfirmUploadResponseSchema = z.object({
  fileKey: z.string(),
  downloadUrl: z.string(),
  fileId: z.string(),
});

export type ConfirmUploadResponse = z.infer<typeof ConfirmUploadResponseSchema>;

// ================================

export const ProxyImageRequestSchema = z.object({
  imageUrl: z.string().url(),
});
export type ProxyImageRequest = z.infer<typeof ProxyImageRequestSchema>;

export const ProxyImageResponseSchema = z.object({
  downloadUrl: z.string(),
});

export type ProxyImageResponse = z.infer<typeof ProxyImageResponseSchema>;
