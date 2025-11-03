import { z } from "zod";

// ============================================
// Mention Enums
// ============================================

/**
 * Mention type - defines what kind of entity is being mentioned
 * Extensible for future document/subspace mentions
 */
export enum MentionType {
  USER = "user", // @mention for user notifications
  // Future: DOCUMENT = "document", // Link to document
  // Future: SUBSPACE = "subspace", // Link to collection/subspace
}

// Zod schema for validation
export const MentionTypeSchema = z.enum(["user"]);

// ============================================
// Mention Types
// ============================================

/**
 * Mention attributes - stored in TipTap JSON node
 * Each mention instance has a unique ID for diff detection
 */
export const MentionAttrsSchema = z.object({
  id: z.string(), // Unique UUID per mention instance (for diff tracking)
  type: MentionTypeSchema, // Type of mention
  modelId: z.string(), // ID of the mentioned entity (e.g., user ID)
  label: z.string(), // Display name (e.g., "Alice", "Project Docs")
  actorId: z.string().optional(), // ID of user who created the mention
});

export type MentionAttrs = z.infer<typeof MentionAttrsSchema>;

// ============================================
// API Request Schemas
// ============================================

/**
 * Suggest mention users request
 * Used for autocomplete when typing "@" in comment editor
 */
export const SuggestMentionUsersRequestSchema = z.object({
  documentId: z.string(), // Required for permission context
  query: z.string().optional(), // Search term (empty = recent collaborators)
});

export type SuggestMentionUsersRequest = z.infer<typeof SuggestMentionUsersRequestSchema>;

// ============================================
// API Response Schemas
// ============================================

/**
 * User summary for mention autocomplete
 * Reuses UserSummary from comment contracts
 */
export const MentionUserSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
  imageUrl: z.string().nullable(),
});

export type MentionUserSummary = z.infer<typeof MentionUserSummarySchema>;

/**
 * Suggest mention users response
 */
export const SuggestMentionUsersResponseSchema = z.object({
  users: z.array(MentionUserSummarySchema),
});

export type SuggestMentionUsersResponse = z.infer<typeof SuggestMentionUsersResponseSchema>;
