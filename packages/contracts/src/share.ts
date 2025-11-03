import { z } from "zod";

// ============================================================================
// Share DTOs and Response Types
// ============================================================================

// ==================== Request DTOs ====================

/**
 * Document share information DTO
 */
export const docShareInfoSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  workspaceId: z.string(),
  sharedByUserId: z.string(),
  sharedWithUserId: z.string().optional(),
  permission: z.enum(["READ", "COMMENT", "EDIT"]),
  expiresAt: z.coerce.date().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type DocShareInfoDto = z.infer<typeof docShareInfoSchema>;

/**
 * Create share request DTO
 */
export const createShareSchema = z.object({
  documentId: z.string(),
  workspaceId: z.string(),
  sharedWithUserId: z.string().optional(),
  permission: z.enum(["READ", "COMMENT", "EDIT"]).default("READ"),
  expiresAt: z.coerce.date().nullable().optional(),
  message: z.string().optional(),
});
export type CreateShareDto = z.infer<typeof createShareSchema>;

/**
 * Update share request DTO
 */
export const updateShareSchema = z.object({
  permission: z.enum(["READ", "COMMENT", "EDIT"]).optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  message: z.string().optional(),
});
export type UpdateShareDto = z.infer<typeof updateShareSchema>;

/**
 * Revoke share request DTO
 */
export const revokeShareSchema = z.object({
  shareId: z.string(),
});
export type RevokeShareDto = z.infer<typeof revokeShareSchema>;

/**
 * Share list request DTO
 */
export const shareListRequestSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
});
export type ShareListRequest = z.infer<typeof shareListRequestSchema>;

/**
 * List shares shared with me DTO
 */
export const listSharedWithMeSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
export type ListSharedWithMeDto = z.infer<typeof listSharedWithMeSchema>;

/**
 * List shares shared by me DTO
 */
export const listSharedByMeSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});
export type ListSharedByMeDto = z.infer<typeof listSharedByMeSchema>;

// ==================== Response DTOs ====================

/**
 * Share information response
 */
export const shareInfoResponseSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  workspaceId: z.string(),
  sharedByUserId: z.string(),
  sharedWithUserId: z.string().optional(),
  permission: z.enum(["READ", "COMMENT", "EDIT"]),
  expiresAt: z.coerce.date().nullable(),
  message: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  document: z.object({
    id: z.string(),
    title: z.string(),
    icon: z.string().nullable(),
  }),
  workspace: z.object({
    id: z.string(),
    name: z.string(),
  }),
  sharedByUser: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string().nullable(),
  }),
  sharedWithUser: z
    .object({
      id: z.string(),
      email: z.string(),
      displayName: z.string().nullable(),
    })
    .optional(),
});
export type ShareInfoResponse = z.infer<typeof shareInfoResponseSchema>;

/**
 * Share list response
 */
export const shareListResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  data: z.array(shareInfoResponseSchema),
});
export type ShareListResponse = z.infer<typeof shareListResponseSchema>;

/**
 * Share create response
 */
export const shareCreateResponseSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  workspaceId: z.string(),
  sharedByUserId: z.string(),
  sharedWithUserId: z.string().optional(),
  permission: z.enum(["READ", "COMMENT", "EDIT"]),
  expiresAt: z.coerce.date().nullable(),
  message: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ShareCreateResponse = z.infer<typeof shareCreateResponseSchema>;

/**
 * Share update response
 */
export const shareUpdateResponseSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  workspaceId: z.string(),
  sharedByUserId: z.string(),
  sharedWithUserId: z.string().optional(),
  permission: z.enum(["READ", "COMMENT", "EDIT"]),
  expiresAt: z.coerce.date().nullable(),
  message: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ShareUpdateResponse = z.infer<typeof shareUpdateResponseSchema>;

/**
 * Share revoke response
 */
export const shareRevokeResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export type ShareRevokeResponse = z.infer<typeof shareRevokeResponseSchema>;
