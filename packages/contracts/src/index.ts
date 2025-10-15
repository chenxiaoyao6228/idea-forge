// Export Prisma types
export * from "./prisma-type-generated";

// Export custom types
export * from "./types";

// Export API contracts
export * from "./_base";
export * from "./auth";
export * from "./ability";
export * from "./ai";
export * from "./file";
export * from "./workspace";
export * from "./star";
export * from "./group";
export * from "./user";
export * from "./permission";
export * from "./document";
export * from "./subspace";
export * from "./guest-collaborators";
export * from "./public-share";
export * from "./share";

// Export notification contracts (excluding base types already exported from prisma-type-generated)
export type {
  NotificationCategory,
  PermissionRequestMetadata,
  PermissionGrantMetadata,
  PermissionRejectMetadata,
  WorkspaceInvitationMetadata,
  SubspaceInvitationMetadata,
  Notification,
  ListNotificationsRequest,
  ListNotificationsResponse,
  PaginationMetadata,
  MarkAsReadRequest,
  MarkAsReadResponse,
  BatchMarkViewedRequest,
  BatchMarkViewedResponse,
  ResolveActionRequest,
  ResolveActionResponse,
  UnreadCountRequest,
  UnreadCountResponse,
  CategoryCounts,
  UnreadCountByWorkspaceResponse,
  NotificationCreateEvent,
  NotificationUpdateEvent,
  NotificationActionResolvedEvent,
  NotificationWebSocketEvent,
} from "./notification";
export {
  SPECIAL_WORKSPACE_ID,
  NotificationEventType,
  ActionType,
  ActionStatus,
  NotificationCategorySchema,
  NotificationEventTypeSchema,
  ActionTypeSchema,
  ActionStatusSchema,
  PermissionRequestMetadataSchema,
  PermissionGrantMetadataSchema,
  PermissionRejectMetadataSchema,
  WorkspaceInvitationMetadataSchema,
  SubspaceInvitationMetadataSchema,
  NotificationSchema,
  ListNotificationsRequestSchema,
  ListNotificationsResponseSchema,
  PaginationMetadataSchema,
  MarkAsReadRequestSchema,
  MarkAsReadResponseSchema,
  BatchMarkViewedRequestSchema,
  BatchMarkViewedResponseSchema,
  ResolveActionRequestSchema,
  ResolveActionResponseSchema,
  UnreadCountRequestSchema,
  UnreadCountResponseSchema,
  CategoryCountsSchema,
  UnreadCountByWorkspaceResponseSchema,
  NotificationCreateEventSchema,
  NotificationUpdateEventSchema,
  NotificationActionResolvedEventSchema,
  NotificationWebSocketEventSchema,
  getCategoryEventTypes,
  isActionRequiredEvent,
  isInformationalEvent,
} from "./notification";
