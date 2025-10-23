import { z } from "zod";

// ============================================
// Comment Enums
// ============================================

/**
 * Comment status filter for listing
 */
export enum CommentStatusFilter {
  RESOLVED = "resolved",
  UNRESOLVED = "unresolved",
}

/**
 * Comment sort type
 */
export enum CommentSortType {
  MOST_RECENT = "mostRecent",
  ORDER_IN_DOCUMENT = "orderInDocument",
}

// Zod schemas for validation - use z.enum for better JSON API compatibility
export const CommentStatusFilterSchema = z.enum(["resolved", "unresolved"]);
export const CommentSortTypeSchema = z.enum(["mostRecent", "orderInDocument"]);

// ============================================
// Comment Types
// ============================================

/**
 * Reaction summary for comment
 */
export const ReactionSummarySchema = z.object({
  emoji: z.string(),
  userIds: z.array(z.string()),
});

export type ReactionSummary = z.infer<typeof ReactionSummarySchema>;

/**
 * User summary for comment relations
 */
export const UserSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

export type UserSummary = z.infer<typeof UserSummarySchema>;

/**
 * Comment DTO with computed properties for API responses
 */
export const CommentDtoSchema = z.object({
  id: z.string(),
  data: z.any(), // TipTap JSON
  documentId: z.string(),
  parentCommentId: z.string().nullable(),
  createdById: z.string(),
  createdBy: UserSummarySchema.optional(),
  resolvedAt: z.string().nullable(),
  resolvedById: z.string().nullable(),
  resolvedBy: UserSummarySchema.optional().nullable(),
  reactions: z.array(ReactionSummarySchema).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),

  // Computed properties (added by presenter)
  isResolved: z.boolean().optional(),
  isReply: z.boolean().optional(),
  anchorText: z.string().optional(), // Extracted from document
});

export type CommentDto = z.infer<typeof CommentDtoSchema>;

// ============================================
// API Request Schemas
// ============================================

/**
 * Create comment request
 * Following Outline's exact schema
 */
export const createCommentSchema = z
  .object({
    id: z.string().optional(),
    documentId: z.string(),
    parentCommentId: z.string().optional(),
    data: z.any().optional(), // TipTap JSON
    text: z.string().optional(), // Plain text (will be converted to TipTap)
    anchorText: z.string().optional(), // The selected text this comment is anchored to
  })
  .refine((obj) => !!(obj.data || obj.text), {
    message: "One of data or text is required",
  });

export const CreateCommentRequestSchema = createCommentSchema;
export type CreateCommentRequest = z.infer<typeof createCommentSchema>;

/**
 * List comments request
 * Following Outline's exact schema with filtering and pagination
 */
export const listCommentsSchema = z.object({
  documentId: z.string().optional(),
  workspaceId: z.string().optional(),
  parentCommentId: z.string().optional(),
  statusFilter: z.array(CommentStatusFilterSchema).optional(),
  includeAnchorText: z.boolean().optional(),
  sort: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  direction: z.enum(["ASC", "DESC"]).default("DESC"),
  limit: z.number().min(1).max(100).default(25),
  offset: z.number().min(0).default(0),
});

export const ListCommentsRequestSchema = listCommentsSchema;
export type ListCommentsRequest = z.infer<typeof listCommentsSchema>;

/**
 * Update comment request
 */
export const updateCommentSchema = z.object({
  id: z.string(),
  data: z.any(), // TipTap JSON
});

export const UpdateCommentRequestSchema = updateCommentSchema;
export type UpdateCommentRequest = z.infer<typeof updateCommentSchema>;

/**
 * Resolve comment request
 */
export const resolveCommentSchema = z.object({
  id: z.string(),
});

export const ResolveCommentRequestSchema = resolveCommentSchema;
export type ResolveCommentRequest = z.infer<typeof resolveCommentSchema>;

/**
 * Unresolve comment request
 */
export const unresolveCommentSchema = z.object({
  id: z.string(),
});

export const UnresolveCommentRequestSchema = unresolveCommentSchema;
export type UnresolveCommentRequest = z.infer<typeof unresolveCommentSchema>;

/**
 * Add reaction request
 */
export const addReactionSchema = z.object({
  id: z.string(), // Comment ID
  emoji: z.string().regex(/^.{1,10}$/), // Emoji character (1-10 chars)
});

export const AddReactionRequestSchema = addReactionSchema;
export type AddReactionRequest = z.infer<typeof addReactionSchema>;

/**
 * Remove reaction request
 */
export const removeReactionSchema = z.object({
  id: z.string(), // Comment ID
  emoji: z.string().regex(/^.{1,10}$/),
});

export const RemoveReactionRequestSchema = removeReactionSchema;
export type RemoveReactionRequest = z.infer<typeof removeReactionSchema>;

/**
 * Delete comment request
 */
export const deleteCommentSchema = z.object({
  id: z.string(),
});

export const DeleteCommentRequestSchema = deleteCommentSchema;
export type DeleteCommentRequest = z.infer<typeof deleteCommentSchema>;

// ============================================
// API Response Schemas
// ============================================

/**
 * Create comment response
 */
export const CreateCommentResponseSchema = z.object({
  comment: CommentDtoSchema,
});

export type CreateCommentResponse = z.infer<typeof CreateCommentResponseSchema>;

/**
 * List comments response
 */
export const ListCommentsResponseSchema = z.object({
  data: z.array(CommentDtoSchema),
  pagination: z.object({
    offset: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
});

export type ListCommentsResponse = z.infer<typeof ListCommentsResponseSchema>;

/**
 * Update comment response
 */
export const UpdateCommentResponseSchema = z.object({
  comment: CommentDtoSchema,
});

export type UpdateCommentResponse = z.infer<typeof UpdateCommentResponseSchema>;

/**
 * Resolve comment response
 */
export const ResolveCommentResponseSchema = z.object({
  comment: CommentDtoSchema,
});

export type ResolveCommentResponse = z.infer<typeof ResolveCommentResponseSchema>;

/**
 * Unresolve comment response
 */
export const UnresolveCommentResponseSchema = z.object({
  comment: CommentDtoSchema,
});

export type UnresolveCommentResponse = z.infer<typeof UnresolveCommentResponseSchema>;

/**
 * Reaction success response
 */
export const ReactionResponseSchema = z.object({
  success: z.boolean(),
});

export type ReactionResponse = z.infer<typeof ReactionResponseSchema>;

/**
 * Delete comment response
 */
export const DeleteCommentResponseSchema = z.object({
  success: z.boolean(),
});

export type DeleteCommentResponse = z.infer<typeof DeleteCommentResponseSchema>;

// ============================================
// WebSocket Event Schemas
// ============================================

export const CommentCreatedEventSchema = z.object({
  type: z.literal("comment.created"),
  payload: CommentDtoSchema,
});

export type CommentCreatedEvent = z.infer<typeof CommentCreatedEventSchema>;

export const CommentUpdatedEventSchema = z.object({
  type: z.literal("comment.updated"),
  payload: CommentDtoSchema,
});

export type CommentUpdatedEvent = z.infer<typeof CommentUpdatedEventSchema>;

export const CommentResolvedEventSchema = z.object({
  type: z.literal("comment.resolved"),
  payload: CommentDtoSchema,
});

export type CommentResolvedEvent = z.infer<typeof CommentResolvedEventSchema>;

export const CommentUnresolvedEventSchema = z.object({
  type: z.literal("comment.unresolved"),
  payload: CommentDtoSchema,
});

export type CommentUnresolvedEvent = z.infer<typeof CommentUnresolvedEventSchema>;

export const CommentDeletedEventSchema = z.object({
  type: z.literal("comment.deleted"),
  payload: z.object({
    id: z.string(),
    documentId: z.string(),
  }),
});

export type CommentDeletedEvent = z.infer<typeof CommentDeletedEventSchema>;

export const ReactionAddedEventSchema = z.object({
  type: z.literal("comment.reaction_added"),
  payload: z.object({
    commentId: z.string(),
    emoji: z.string(),
    userId: z.string(),
  }),
});

export type ReactionAddedEvent = z.infer<typeof ReactionAddedEventSchema>;

export const ReactionRemovedEventSchema = z.object({
  type: z.literal("comment.reaction_removed"),
  payload: z.object({
    commentId: z.string(),
    emoji: z.string(),
    userId: z.string(),
  }),
});

export type ReactionRemovedEvent = z.infer<typeof ReactionRemovedEventSchema>;

// Union of all WebSocket event types
export const CommentWebSocketEventSchema = z.discriminatedUnion("type", [
  CommentCreatedEventSchema,
  CommentUpdatedEventSchema,
  CommentResolvedEventSchema,
  CommentUnresolvedEventSchema,
  CommentDeletedEventSchema,
  ReactionAddedEventSchema,
  ReactionRemovedEventSchema,
]);

export type CommentWebSocketEvent = z.infer<typeof CommentWebSocketEventSchema>;

// ============================================
// Helper Types for Background Jobs
// ============================================

/**
 * Comment created job data
 */
export interface CommentCreatedJobData {
  commentId: string;
  userId: string;
}

/**
 * Comment updated job data
 */
export interface CommentUpdatedJobData {
  commentId: string;
  newMentionIds: string[];
}

/**
 * Comment resolved job data
 */
export interface CommentResolvedJobData {
  commentId: string;
  resolvedById: string;
}
