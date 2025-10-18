import { z } from "zod";
import { NotificationSchema } from "./prisma-type-generated";

// ============================================
// Notification Enums (Application Layer)
// ============================================

/**
 * Notification event types - defines all possible notification events
 * Stored as strings in database for flexibility
 */
export enum NotificationEventType {
  // Permission workflow events (→ Sharing tab)
  PERMISSION_REQUEST = "PERMISSION_REQUEST", // User requests access to document (action-required)
  PERMISSION_GRANT = "PERMISSION_GRANT", // Permission request approved (informational)
  PERMISSION_REJECT = "PERMISSION_REJECT", // Permission request rejected (informational)

  // Invitation events (→ Inbox tab)
  WORKSPACE_INVITATION = "WORKSPACE_INVITATION", // User invited to workspace (action-required)
  SUBSPACE_INVITATION = "SUBSPACE_INVITATION", // User invited to private subspace (action-required)
  WORKSPACE_REMOVED = "WORKSPACE_REMOVED", // User removed from workspace (informational)
}

/**
 * Action types for notifications requiring user action
 */
export enum ActionType {
  PERMISSION_REQUEST = "PERMISSION_REQUEST", // Request access to document
  WORKSPACE_INVITATION = "WORKSPACE_INVITATION", // Invite to join workspace (accept/decline)
  SUBSPACE_INVITATION = "SUBSPACE_INVITATION", // Invite to join private subspace
}

/**
 * Action status for tracking notification resolution
 */
export enum ActionStatus {
  PENDING = "PENDING", // Awaiting user action
  APPROVED = "APPROVED", // User approved
  REJECTED = "REJECTED", // User rejected
  CANCELED = "CANCELED", // Requester canceled
  EXPIRED = "EXPIRED", // Timeout (e.g., 7 days)
}

// Zod schemas for validation
export const NotificationEventTypeSchema = z.nativeEnum(NotificationEventType);
export const ActionTypeSchema = z.nativeEnum(ActionType);
export const ActionStatusSchema = z.nativeEnum(ActionStatus);

// ============================================
// Constants
// ============================================

/**
 * Special workspace ID for cross-workspace notifications
 * Used for notifications that are not tied to a specific workspace:
 * - Workspace invitations (user not yet member)
 * - Global subscription notifications
 * - Cross-workspace AI prompts
 */
export const SPECIAL_WORKSPACE_ID = "00000000-0000-0000-0000-000000000000";

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

// ============================================
// API Request/Response Schemas
// ============================================

// List notifications request (using page-based pagination)
export const ListNotificationsRequestSchema = z.object({
  category: NotificationCategorySchema.optional(),
  read: z.boolean().optional(), // Filter by read/unread status
  workspaceId: z.string().optional(), // Filter by workspace (includes cross-workspace when provided)
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

// Mark all as read request
export const MarkAllAsReadRequestSchema = z.object({
  category: NotificationCategorySchema.optional(), // Optional category filter
  workspaceId: z.string().optional(), // Optional workspace filter
});

export type MarkAllAsReadRequest = z.infer<typeof MarkAllAsReadRequestSchema>;

// Mark all as read response
export const MarkAllAsReadResponseSchema = z.object({
  success: z.boolean(),
  markedCount: z.number().int(),
});

export type MarkAllAsReadResponse = z.infer<typeof MarkAllAsReadResponseSchema>;

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

// Category counts schema (reused across workspace-grouped responses)
export const CategoryCountsSchema = z.object({
  MENTIONS: z.number().int(),
  SHARING: z.number().int(),
  INBOX: z.number().int(),
  SUBSCRIBE: z.number().int(),
});

export type CategoryCounts = z.infer<typeof CategoryCountsSchema>;

// Unread count by workspace response (for cross-workspace badge)
export const UnreadCountByWorkspaceResponseSchema = z.object({
  // Workspace ID -> category counts
  byWorkspace: z.record(z.string(), CategoryCountsSchema),
  // Cross-workspace notifications (SPECIAL_WORKSPACE_ID)
  crossWorkspace: CategoryCountsSchema,
});

export type UnreadCountByWorkspaceResponse = z.infer<typeof UnreadCountByWorkspaceResponseSchema>;

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
      return [NotificationEventType.PERMISSION_REQUEST, NotificationEventType.PERMISSION_GRANT, NotificationEventType.PERMISSION_REJECT];
    case "INBOX":
      return [NotificationEventType.WORKSPACE_INVITATION, NotificationEventType.SUBSPACE_INVITATION, NotificationEventType.WORKSPACE_REMOVED];
    case "MENTIONS":
    case "SUBSCRIBE":
      // Phase 2+ will add event types for these categories
      return [];
  }
}

/**
 * Determine if a notification is action-required based on event type
 */
export function isActionRequiredEvent(eventType: NotificationEventType): boolean {
  return [NotificationEventType.PERMISSION_REQUEST, NotificationEventType.WORKSPACE_INVITATION, NotificationEventType.SUBSPACE_INVITATION].includes(eventType);
}

/**
 * Determine if a notification is informational (auto-read eligible)
 */
export function isInformationalEvent(eventType: NotificationEventType): boolean {
  return [NotificationEventType.PERMISSION_GRANT, NotificationEventType.PERMISSION_REJECT].includes(eventType);
}

// ============================================
// Notification Settings Types & Schemas
// ============================================

/**
 * Category settings - represents the enabled/disabled state for a notification category
 */
export const CategorySettingsSchema = z.object({
  category: NotificationCategorySchema,
  enabled: z.boolean(),
  eventTypes: z.array(NotificationEventTypeSchema), // Event types included in this category
});

export type CategorySettings = z.infer<typeof CategorySettingsSchema>;

/**
 * Get notification settings response - returns all category settings for the user
 */
export const GetNotificationSettingsResponseSchema = z.object({
  settings: z.array(CategorySettingsSchema),
});

export type GetNotificationSettingsResponse = z.infer<typeof GetNotificationSettingsResponseSchema>;

/**
 * Update category settings request - enable/disable a specific category
 */
export const UpdateCategorySettingsRequestSchema = z.object({
  category: NotificationCategorySchema,
  enabled: z.boolean(),
});

export type UpdateCategorySettingsRequest = z.infer<typeof UpdateCategorySettingsRequestSchema>;

/**
 * Update category settings response - confirmation and updated settings
 */
export const UpdateCategorySettingsResponseSchema = z.object({
  success: z.boolean(),
  settings: CategorySettingsSchema,
});

export type UpdateCategorySettingsResponse = z.infer<typeof UpdateCategorySettingsResponseSchema>;
