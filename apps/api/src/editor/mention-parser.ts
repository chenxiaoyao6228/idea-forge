/**
 * Mention Parser Utility
 *
 * Extracts mention nodes from TipTap JSON content for notification processing.
 */

import type { JSONContent } from "@tiptap/core";
import type { MentionAttrs, MentionType } from "@idea/contracts";

/**
 * Options for parsing mentions
 */
export interface ParseMentionsOptions {
  /** Filter by mention type (e.g., "user") */
  type?: MentionType;
  /** Filter by specific model ID */
  modelId?: string;
}

/**
 * Parse all mentions from TipTap JSON content
 *
 * Recursively traverses the document tree and extracts mention nodes.
 * Automatically deduplicates by mention ID.
 *
 * @param content - TipTap JSON content
 * @param options - Optional filtering options
 * @returns Array of mention attributes
 *
 * @example
 * ```ts
 * const mentions = parseMentions(comment.data, { type: "user" });
 * // Returns: [{ id: "m1", type: "user", modelId: "u1", label: "Alice", actorId: "u2" }]
 * ```
 */
export function parseMentions(content: JSONContent | null | undefined, options?: ParseMentionsOptions): MentionAttrs[] {
  if (!content) {
    return [];
  }

  const mentions: MentionAttrs[] = [];
  const seenIds = new Set<string>();

  /**
   * Recursive traversal function
   */
  function traverse(node: JSONContent): void {
    // Check if this is a mention node
    if (node.type === "mention" && node.attrs) {
      const attrs = node.attrs as Partial<MentionAttrs>;

      // Apply type filter if specified
      if (options?.type && attrs.type !== options.type) {
        return;
      }

      // Apply modelId filter if specified
      if (options?.modelId && attrs.modelId !== options.modelId) {
        return;
      }

      // Deduplicate by mention ID
      if (attrs.id && !seenIds.has(attrs.id)) {
        seenIds.add(attrs.id);

        // Only add if has required fields
        if (attrs.type && attrs.modelId && attrs.label) {
          mentions.push({
            id: attrs.id,
            type: attrs.type as MentionType,
            modelId: attrs.modelId,
            label: attrs.label,
            actorId: attrs.actorId,
          });
        }
      }
    }

    // Traverse child nodes
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }

  traverse(content);

  return mentions;
}

/**
 * Calculate the difference between two mention lists
 *
 * Returns mentions that exist in newContent but not in oldContent.
 * Used for diff-based notifications (only notify NEW mentions).
 *
 * @param oldContent - Previous TipTap JSON content
 * @param newContent - Updated TipTap JSON content
 * @returns Array of newly added mention attributes
 *
 * @example
 * ```ts
 * // Old: "@Alice" (m1)
 * // New: "@Alice @Bob" (m1, m2)
 * const newMentions = calculateMentionDiff(oldData, newData);
 * // Returns: [{ id: "m2", type: "user", modelId: "bob-id", ... }]
 * ```
 */
export function calculateMentionDiff(oldContent: JSONContent | null | undefined, newContent: JSONContent | null | undefined): MentionAttrs[] {
  const oldMentions = parseMentions(oldContent);
  const newMentions = parseMentions(newContent);

  // Create set of old mention IDs for fast lookup
  const oldMentionIds = new Set(oldMentions.map((m) => m.id));

  // Filter new mentions to only those not in old content
  return newMentions.filter((mention) => !oldMentionIds.has(mention.id));
}

/**
 * Get unique user IDs from mention list
 *
 * Helper function to extract just the user IDs from parsed mentions.
 * Useful for notification targeting.
 *
 * @param mentions - Array of mention attributes
 * @returns Array of unique user IDs
 *
 * @example
 * ```ts
 * const mentions = parseMentions(content, { type: "user" });
 * const userIds = getUniqueMentionedUserIds(mentions);
 * // Returns: ["user-1", "user-2", "user-3"]
 * ```
 */
export function getUniqueMentionedUserIds(mentions: MentionAttrs[]): string[] {
  const userIds = new Set<string>();

  for (const mention of mentions) {
    if (mention.type === "user" && mention.modelId) {
      userIds.add(mention.modelId);
    }
  }

  return Array.from(userIds);
}

/**
 * Count mentions by type
 *
 * Returns a count of mentions grouped by type.
 *
 * @param content - TipTap JSON content
 * @returns Object with counts per mention type
 *
 * @example
 * ```ts
 * const counts = countMentionsByType(content);
 * // Returns: { user: 3, document: 0, subspace: 0 }
 * ```
 */
export function countMentionsByType(content: JSONContent | null | undefined): Record<MentionType, number> {
  const mentions = parseMentions(content);

  const counts: Record<MentionType, number> = {
    user: 0,
  };

  for (const mention of mentions) {
    counts[mention.type] = (counts[mention.type] || 0) + 1;
  }

  return counts;
}
