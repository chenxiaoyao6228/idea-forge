import { z } from "zod";
// Re-export Prisma-generated base types to avoid duplication
import type { NotificationEventType, ActionType, ActionStatus } from "./prisma-type-generated";
import { NotificationEventTypeSchema, ActionTypeSchema, ActionStatusSchema, NotificationSchema as PrismaNotificationSchema } from "./prisma-type-generated";

// Re-export base types for convenience
export type { NotificationEventType, ActionType, ActionStatus };
export { NotificationEventTypeSchema, ActionTypeSchema, ActionStatusSchema };

// ============================================
// Additional Notification Types
// ============================================

export const NotificationCategorySchema = z.enum(["MENTIONS", "SHARING", "INBOX", "SUBSCRIBE"]);

export type NotificationCategory = z.infer<typeof NotificationCategorySchema>;

// ============================================
// Notification Metadata Schemas
// ============================================

// Permission request metadata
export const PermissionRequestMetadataSchema = z.object({
  requestedPermission: z.enum(["READ", "COMMENT", "EDIT", "MANAGE"]),
  message: z.string().optional(),
  documentTitle: z.string(),
  documentId: z.string(),
});

export type PermissionRequestMetadata = z.infer<typeof PermissionRequestMetadataSchema>;

// Permission grant/reject metadata
export const PermissionGrantMetadataSchema = z.object({
  grantedPermission: z.enum(["READ", "COMMENT", "EDIT", "MANAGE"]),
  documentTitle: z.string(),
  documentId: z.string(),
  actorName: z.string(),
});

export type PermissionGrantMetadata = z.infer<typeof PermissionGrantMetadataSchema>;

export const PermissionRejectMetadataSchema = z.object({
  requestedPermission: z.enum(["READ", "COMMENT", "EDIT", "MANAGE"]),
  documentTitle: z.string(),
  documentId: z.string(),
  actorName: z.string(),
  reason: z.string().optional(),
});

export type PermissionRejectMetadata = z.infer<typeof PermissionRejectMetadataSchema>;

// Workspace invitation metadata
export const WorkspaceInvitationMetadataSchema = z.object({
  workspaceName: z.string(),
  workspaceId: z.string(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
  message: z.string().optional(),
  inviterName: z.string(),
});

export type WorkspaceInvitationMetadata = z.infer<typeof WorkspaceInvitationMetadataSchema>;

// Subspace invitation metadata
export const SubspaceInvitationMetadataSchema = z.object({
  subspaceName: z.string(),
  subspaceId: z.string(),
  workspaceName: z.string(),
  workspaceId: z.string(),
  role: z.enum(["ADMIN", "MEMBER"]),
  message: z.string().optional(),
  inviterName: z.string(),
});

export type SubspaceInvitationMetadata = z.infer<typeof SubspaceInvitationMetadataSchema>;

// ============================================
// API Notification Schema (with transformations)
// ============================================

// API version of Notification schema that handles JSON to Date transformations
export const NotificationSchema = PrismaNotificationSchema.extend({
  // Prisma schema already has correct types, just re-export
});

export type Notification = z.infer<typeof NotificationSchema>;

// ============================================
// API Request/Response Schemas
// ============================================

// List notifications request (using page-based pagination)
export const ListNotificationsRequestSchema = z.object({
  category: NotificationCategorySchema.optional(),
  read: z.boolean().optional(), // Filter by read/unread status
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type ListNotificationsRequest = z.infer<typeof ListNotificationsRequestSchema>;

// Pagination metadata (following unified pagination format)
export const PaginationMetadataSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  pageCount: z.number().int(),
});

export type PaginationMetadata = z.infer<typeof PaginationMetadataSchema>;

// List notifications response (following unified pagination format)
export const ListNotificationsResponseSchema = z.object({
  data: z.array(NotificationSchema),
  pagination: PaginationMetadataSchema,
});

export type ListNotificationsResponse = z.infer<typeof ListNotificationsResponseSchema>;

// Mark as read request
export const MarkAsReadRequestSchema = z.object({
  notificationId: z.string(),
});

export type MarkAsReadRequest = z.infer<typeof MarkAsReadRequestSchema>;

// Mark as read response
export const MarkAsReadResponseSchema = z.object({
  success: z.boolean(),
  notification: NotificationSchema,
});

export type MarkAsReadResponse = z.infer<typeof MarkAsReadResponseSchema>;

// Batch mark as viewed request (for viewport tracking)
export const BatchMarkViewedRequestSchema = z.object({
  notificationIds: z.array(z.string()).min(1).max(50),
});

export type BatchMarkViewedRequest = z.infer<typeof BatchMarkViewedRequestSchema>;

// Batch mark as viewed response
export const BatchMarkViewedResponseSchema = z.object({
  success: z.boolean(),
  markedCount: z.number().int(),
});

export type BatchMarkViewedResponse = z.infer<typeof BatchMarkViewedResponseSchema>;

// Resolve action request
export const ResolveActionRequestSchema = z.object({
  notificationId: z.string(),
  action: z.enum(["approve", "reject", "accept", "decline"]),
  reason: z.string().optional(), // Optional rejection reason
});

export type ResolveActionRequest = z.infer<typeof ResolveActionRequestSchema>;

// Resolve action response
export const ResolveActionResponseSchema = z.object({
  success: z.boolean(),
  notification: NotificationSchema,
  message: z.string().optional(),
});

export type ResolveActionResponse = z.infer<typeof ResolveActionResponseSchema>;

// Unread count request
export const UnreadCountRequestSchema = z.object({
  category: NotificationCategorySchema.optional(),
});

export type UnreadCountRequest = z.infer<typeof UnreadCountRequestSchema>;

// Unread count response
export const UnreadCountResponseSchema = z.object({
  total: z.number().int(),
  byCategory: z.object({
    MENTIONS: z.number().int(),
    SHARING: z.number().int(),
    INBOX: z.number().int(),
    SUBSCRIBE: z.number().int(),
  }),
});

export type UnreadCountResponse = z.infer<typeof UnreadCountResponseSchema>;

// ============================================
// WebSocket Event Schemas
// ============================================

export const NotificationCreateEventSchema = z.object({
  type: z.literal("notification.create"),
  payload: NotificationSchema,
});

export type NotificationCreateEvent = z.infer<typeof NotificationCreateEventSchema>;

export const NotificationUpdateEventSchema = z.object({
  type: z.literal("notification.update"),
  payload: NotificationSchema,
});

export type NotificationUpdateEvent = z.infer<typeof NotificationUpdateEventSchema>;

export const NotificationActionResolvedEventSchema = z.object({
  type: z.literal("notification.action_resolved"),
  payload: NotificationSchema,
});

export type NotificationActionResolvedEvent = z.infer<typeof NotificationActionResolvedEventSchema>;

// Union of all WebSocket event types
export const NotificationWebSocketEventSchema = z.discriminatedUnion("type", [
  NotificationCreateEventSchema,
  NotificationUpdateEventSchema,
  NotificationActionResolvedEventSchema,
]);

export type NotificationWebSocketEvent = z.infer<typeof NotificationWebSocketEventSchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Map notification category to event types
 * Used by backend to filter notifications by category
 */
export function getCategoryEventTypes(category: NotificationCategory): NotificationEventType[] {
  switch (category) {
    case "SHARING":
      return ["PERMISSION_REQUEST", "PERMISSION_GRANT", "PERMISSION_REJECT", "WORKSPACE_INVITATION", "SUBSPACE_INVITATION"];
    case "MENTIONS":
    case "INBOX":
    case "SUBSCRIBE":
      // Phase 2+ will add event types for these categories
      return [];
  }
}

/**
 * Determine if a notification is action-required based on event type
 */
export function isActionRequiredEvent(eventType: NotificationEventType): boolean {
  return ["PERMISSION_REQUEST", "WORKSPACE_INVITATION", "SUBSPACE_INVITATION"].includes(eventType);
}

/**
 * Determine if a notification is informational (auto-read eligible)
 */
export function isInformationalEvent(eventType: NotificationEventType): boolean {
  return ["PERMISSION_GRANT", "PERMISSION_REJECT"].includes(eventType);
}
