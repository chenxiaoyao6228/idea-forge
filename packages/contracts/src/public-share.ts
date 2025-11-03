import { z } from "zod";
import { PermissionLevelSchema } from "./prisma-type-generated";

// ============================================================================
// Base Types & Enums
// ============================================================================

/**
 * Permission levels for public shares
 * Phase 1: Only READ is exposed in UI
 */
export const publicSharePermissionSchema = z.enum(["READ", "COMMENT"]);
export type PublicSharePermission = z.infer<typeof publicSharePermissionSchema>;

/**
 * Expiration duration options
 */
export const expirationDurationSchema = z.enum(["NEVER", "ONE_HOUR", "ONE_DAY", "ONE_WEEK", "ONE_MONTH"]);

/**
 * Legacy enum for backward compatibility
 */
export enum ExpirationDurationEnum {
  NEVER = "NEVER",
  ONE_HOUR = "ONE_HOUR",
  ONE_DAY = "ONE_DAY",
  ONE_WEEK = "ONE_WEEK",
  ONE_MONTH = "ONE_MONTH",
}

// Type alias for the schema
export type ExpirationDuration = z.infer<typeof expirationDurationSchema>;

// Alias for backward compatibility
export const ExpirationDurationSchema = expirationDurationSchema;

// ==================== Request Schemas ====================

// Get or create public share (upsert pattern)
export const getOrCreatePublicShareSchema = z.object({
  documentId: z.string(),
  workspaceId: z.string(),
  duration: ExpirationDurationSchema.optional().default(ExpirationDurationEnum.NEVER),
});
export type GetOrCreatePublicShareDto = z.infer<typeof getOrCreatePublicShareSchema>;

// Update public share settings
export const updatePublicShareSchema = z.object({
  duration: ExpirationDurationSchema.optional(),
  urlId: z.string().nullable().optional(), // Phase 2: Custom slug
  allowIndexing: z.boolean().optional(), // Phase 2: SEO toggle
});
export type UpdatePublicShareDto = z.infer<typeof updatePublicShareSchema>;

// List user's public shares
export const listPublicSharesSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  query: z.string().optional(), // Search document title
});
export type ListPublicSharesDto = z.infer<typeof listPublicSharesSchema>;

// ==================== Response Schemas ====================

const navigationTreeNodeSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  icon: z.string().nullable(),
  parentId: z.string().cuid().nullable(),
  children: z.array(z.any()), // Recursive, simplified for schema
});

export type NavigationTreeNode = z.infer<typeof navigationTreeNodeSchema>;

// Public share response
export const publicShareResponseSchema = z.object({
  id: z.string(),
  token: z.string(),
  urlId: z.string().nullable(),
  url: z.string(), // Full public URL
  docId: z.string(),
  workspaceId: z.string(),
  permission: PermissionLevelSchema,
  published: z.boolean(),
  expiresAt: z.coerce.date().nullable(),
  revokedAt: z.coerce.date().nullable(),
  views: z.number(),
  lastAccessedAt: z.coerce.date().nullable(),
  allowIndexing: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  doc: z.object({
    id: z.string(),
    title: z.string(),
  }),
  workspace: z.object({
    id: z.string(),
    name: z.string(),
  }),
  author: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string().nullable(),
  }),
});
export type PublicShareResponse = z.infer<typeof publicShareResponseSchema>;

// Get or create response (includes created flag)
export const getOrCreatePublicShareResponseSchema = z.object({
  data: publicShareResponseSchema,
  created: z.boolean(), // true if newly created, false if already existed
});
export type GetOrCreatePublicShareResponse = z.infer<typeof getOrCreatePublicShareResponseSchema>;

// Update response
export const updatePublicShareResponseSchema = z.object({
  data: publicShareResponseSchema,
});
export type UpdatePublicShareResponse = z.infer<typeof updatePublicShareResponseSchema>;

// Revoke response
export const revokePublicShareResponseSchema = z.object({
  success: z.boolean(),
});
export type RevokePublicShareResponse = z.infer<typeof revokePublicShareResponseSchema>;

// List response with pagination
export const listPublicSharesResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
  data: z.array(publicShareResponseSchema),
});
export type ListPublicSharesResponse = z.infer<typeof listPublicSharesResponseSchema>;

// ==================== Public Access Schemas ====================

// Public document response
export const publicDocumentResponseSchema = z.object({
  share: z.object({
    id: z.string(),
    permission: PermissionLevelSchema,
    views: z.number(),
  }),
  doc: z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    icon: z.string().nullable(),
    coverImage: z.any().nullable(), // JSON field
    workspace: z.object({
      id: z.string(),
      name: z.string(),
      avatar: z.string().nullable(),
    }),
  }),
  children: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      icon: z.string().nullable(),
    }),
  ),
});
export type PublicDocumentResponse = z.infer<typeof publicDocumentResponseSchema>;

// ==================== WebSocket Event Payloads ====================

export const publicShareCreatedEventSchema = z.object({
  docId: z.string(),
  shareId: z.string(),
  token: z.string(),
  url: z.string(),
  expiresAt: z.coerce.date().nullable(),
  createdBy: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string().nullable(),
  }),
});
export type PublicShareCreatedEvent = z.infer<typeof publicShareCreatedEventSchema>;

export const publicShareUpdatedEventSchema = z.object({
  docId: z.string(),
  shareId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date().nullable(),
  updatedBy: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string().nullable(),
  }),
});
export type PublicShareUpdatedEvent = z.infer<typeof publicShareUpdatedEventSchema>;

export const publicShareRevokedEventSchema = z.object({
  docId: z.string(),
  shareId: z.string(),
  token: z.string(),
  revokedBy: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string().nullable(),
  }),
});
export type PublicShareRevokedEvent = z.infer<typeof publicShareRevokedEventSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate expiration date from duration
 */
export function calculateExpirationDate(duration: ExpirationDuration | string): Date | null {
  if (duration === "NEVER" || duration === ExpirationDurationEnum.NEVER) return null;

  const now = new Date();
  switch (duration) {
    case "ONE_HOUR":
    case ExpirationDurationEnum.ONE_HOUR:
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "ONE_DAY":
    case ExpirationDurationEnum.ONE_DAY:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "ONE_WEEK":
    case ExpirationDurationEnum.ONE_WEEK:
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "ONE_MONTH":
    case ExpirationDurationEnum.ONE_MONTH:
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

/**
 * Check if share is expired
 */
export function isShareExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}

/**
 * Check if share is active (not revoked and not expired)
 */
export function isShareActive(revokedAt: Date | null, expiresAt: Date | null): boolean {
  if (revokedAt) return false;
  if (isShareExpired(expiresAt)) return false;
  return true;
}
