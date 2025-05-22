import { z } from "zod";

export const UploadCredentialsRequestSchema = z.object({
  fileName: z.string(),
  ext: z.string(),
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
