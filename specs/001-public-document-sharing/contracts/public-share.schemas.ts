/**
 * Public Share API Contracts
 *
 * Zod schemas for type-safe API communication between frontend and backend.
 * These schemas will be placed in packages/contracts/src/public-share.ts
 *
 * @packageDocumentation
 */

import { z } from "zod";

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
export const expirationDurationSchema = z.enum([
  "NEVER",
  "ONE_HOUR",
  "ONE_DAY",
  "ONE_WEEK",
  "ONE_MONTH",
]);
export type ExpirationDuration = z.infer<typeof expirationDurationSchema>;

// ============================================================================
// Request Schemas (API Inputs)
// ============================================================================

/**
 * Create or update public share
 * POST /api/public-shares
 */
export const createPublicShareSchema = z.object({
  docId: z.string().cuid("Invalid document ID"),
  expiration: expirationDurationSchema.default("NEVER"),
  permission: publicSharePermissionSchema.default("READ"),
});
export type CreatePublicShareDto = z.infer<typeof createPublicShareSchema>;

/**
 * Get public share info (authenticated)
 * GET /api/public-shares/:docId
 */
export const getPublicShareSchema = z.object({
  docId: z.string().cuid("Invalid document ID"),
});
export type GetPublicShareDto = z.infer<typeof getPublicShareSchema>;

/**
 * Revoke public share
 * DELETE /api/public-shares/:docId
 */
export const revokePublicShareSchema = z.object({
  docId: z.string().cuid("Invalid document ID"),
});
export type RevokePublicShareDto = z.infer<typeof revokePublicShareSchema>;

/**
 * Regenerate public link (revoke old + create new)
 * POST /api/public-shares/:docId/regenerate
 */
export const regeneratePublicShareSchema = z.object({
  docId: z.string().cuid("Invalid document ID"),
});
export type RegeneratePublicShareDto = z.infer<typeof regeneratePublicShareSchema>;

/**
 * Access public document (anonymous)
 * GET /public/:token or /public/:token/doc/:documentId
 */
export const accessPublicDocumentSchema = z.object({
  token: z.string().min(20, "Invalid share token"),
  documentId: z.string().cuid("Invalid document ID").optional(), // For nested docs
});
export type AccessPublicDocumentDto = z.infer<typeof accessPublicDocumentSchema>;

/**
 * List workspace public shares (authenticated)
 * GET /api/public-shares/workspace/:workspaceId
 */
export const listPublicSharesSchema = z.object({
  workspaceId: z.string().cuid("Invalid workspace ID"),
  includeRevoked: z.boolean().default(false),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});
export type ListPublicSharesDto = z.infer<typeof listPublicSharesSchema>;

// ============================================================================
// Response Schemas (API Outputs)
// ============================================================================

/**
 * Public share response (authenticated endpoints)
 */
export const publicShareResponseSchema = z.object({
  id: z.string().cuid(),
  docId: z.string().cuid(),
  workspaceId: z.string().cuid(),
  token: z.string(),
  url: z.string().url(), // Full public URL
  permission: publicSharePermissionSchema,
  expiresAt: z.date().nullable(),
  revokedAt: z.date().nullable(),
  views: z.number().int().nonnegative(),
  lastAccessedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  author: z.object({
    id: z.string().cuid(),
    displayName: z.string(),
    email: z.string().email(),
  }),
  created: z.boolean(), // Flag for upsert operations (true if newly created)
});
export type PublicShareResponse = z.infer<typeof publicShareResponseSchema>;

const navigationTreeSchema = z
.array(
  z.object({
    id: z.string().cuid(),
    title: z.string(),
    emoji: z.string().nullable(),
    parentId: z.string().cuid().nullable(),
    children: z.array(z.any()).optional(), // Recursive, simplified for schema
  })
)
.optional()

export type NavigationTree= z.infer<typeof navigationTreeSchema>

/**
 * Public document response (anonymous access)
 */
export const publicDocumentResponseSchema = z.object({
  document: z.object({
    id: z.string().cuid(),
    title: z.string(),
    content: z.any(), // Yjs binary or JSON (depends on implementation)
    emoji: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
  }),
  share: z.object({
    token: z.string(),
    permission: publicSharePermissionSchema,
    expiresAt: z.date().nullable(),
  }),
  workspace: z.object({
    id: z.string().cuid(),
    name: z.string(),
    logo: z.string().url().nullable(),
  }),
  // Navigation tree for hierarchical documents
  navigationTree: navigationTreeSchema,
  // If user is authenticated and has workspace permissions
  authenticatedUser: z
    .object({
      userId: z.string().cuid(),
      permission: z.enum(["READ", "COMMENT", "EDIT", "MANAGE"]),
      workspaceUrl: z.string(), // URL to open in workspace
    })
    .nullable(),
});
export type PublicDocumentResponse = z.infer<typeof publicDocumentResponseSchema>;


/**
 * List response with pagination
 */
export const publicShareListResponseSchema = z.object({
  shares: z.array(publicShareResponseSchema),
  pagination: z.object({
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  }),
});
export type PublicShareListResponse = z.infer<typeof publicShareListResponseSchema>;

/**
 * Error response for public endpoints
 */
export const publicShareErrorSchema = z.object({
  error: z.enum([
    "NOT_FOUND",
    "EXPIRED",
    "REVOKED",
    "WORKSPACE_DISABLED",
    "FORBIDDEN",
    "RATE_LIMITED",
  ]),
  message: z.string(),
  expiresAt: z.date().optional(), // Included for EXPIRED errors
  statusCode: z.number().int(),
});
export type PublicShareError = z.infer<typeof publicShareErrorSchema>;

// ============================================================================
// WebSocket Event Schemas
// ============================================================================

/**
 * Public share created event
 */
export const publicShareCreatedEventSchema = z.object({
  type: z.literal("publicShare:created"),
  payload: z.object({
    docId: z.string().cuid(),
    token: z.string(),
    expiresAt: z.date().nullable(),
  }),
});
export type PublicShareCreatedEvent = z.infer<typeof publicShareCreatedEventSchema>;

/**
 * Public share updated event
 */
export const publicShareUpdatedEventSchema = z.object({
  type: z.literal("publicShare:updated"),
  payload: z.object({
    docId: z.string().cuid(),
    expiresAt: z.date().nullable(),
  }),
});
export type PublicShareUpdatedEvent = z.infer<typeof publicShareUpdatedEventSchema>;

/**
 * Public share revoked event
 */
export const publicShareRevokedEventSchema = z.object({
  type: z.literal("publicShare:revoked"),
  payload: z.object({
    docId: z.string().cuid(),
  }),
});
export type PublicShareRevokedEvent = z.infer<typeof publicShareRevokedEventSchema>;

// ============================================================================
// Utility Schemas
// ============================================================================

/**
 * Calculate expiration date from duration
 */
export function calculateExpirationDate(duration: ExpirationDuration): Date | null {
  if (duration === "NEVER") return null;

  const now = new Date();
  switch (duration) {
    case "ONE_HOUR":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "ONE_DAY":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "ONE_WEEK":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "ONE_MONTH":
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
export function isShareActive(
  revokedAt: Date | null,
  expiresAt: Date | null
): boolean {
  if (revokedAt) return false;
  if (isShareExpired(expiresAt)) return false;
  return true;
}

// ============================================================================
// API Endpoint Definitions (for documentation)
// ============================================================================

/**
 * API Endpoints Summary:
 *
 * Authenticated Endpoints (require JWT):
 * - POST   /api/public-shares                     Create/update share
 * - GET    /api/public-shares/:docId              Get share for document
 * - DELETE /api/public-shares/:docId              Revoke share
 * - POST   /api/public-shares/:docId/regenerate   Regenerate token
 * - GET    /api/public-shares/workspace/:workspaceId  List workspace shares
 *
 * Public Endpoints (no auth required):
 * - GET    /api/public/:token                         Access root shared document
 * - GET    /api/public/:token/doc/:documentId         Access child document
 *
 * Rate Limiting:
 * - Authenticated: 500 req/min per user
 * - Public: 100 req/min per IP
 */

export const API_ENDPOINTS = {
  // Authenticated
  CREATE_SHARE: "POST /api/public-shares",
  GET_SHARE: "GET /api/public-shares/:docId",
  REVOKE_SHARE: "DELETE /api/public-shares/:docId",
  REGENERATE_SHARE: "POST /api/public-shares/:docId/regenerate",
  LIST_SHARES: "GET /api/public-shares/workspace/:workspaceId",

  // Public
  ACCESS_ROOT: "GET /api/public/:token",
  ACCESS_CHILD: "GET /api/public/:token/doc/:documentId",
} as const;
