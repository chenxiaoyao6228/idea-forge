import data from "@emoji-mart/data";
import type { EmojiMartData } from "@emoji-mart/data";

// Type-safe emoji data
const TypedData = data as EmojiMartData;

export interface Emoji {
  id: string;
  name: string;
  value: string; // The actual emoji character
  keywords?: string[];
}

/**
 * Convert emoji-mart data to simple emoji list
 * Returns array of emojis with id, name, and character
 */
export const getAllEmojis = (): Emoji[] => {
  return Object.entries(TypedData.emojis).map(([id, emoji]) => ({
    id,
    name: emoji.name,
    value: emoji.skins[0].native,
    keywords: emoji.keywords,
  }));
};

/**
 * Search emojis by query
 * Searches in emoji name and keywords
 */
export const searchEmojis = (query: string, limit = 15): Emoji[] => {
  if (!query) {
    // Return most common emojis when no query
    return getAllEmojis().slice(0, limit);
  }

  const queryLower = query.toLowerCase();
  const allEmojis = getAllEmojis();

  // Filter by name or keywords
  const matched = allEmojis.filter((emoji) => {
    const nameMatch = emoji.name.toLowerCase().includes(queryLower);
    const keywordMatch = emoji.keywords?.some((kw) => kw.toLowerCase().includes(queryLower));
    return nameMatch || keywordMatch;
  });

  // Sort: exact match first, then starts-with, then contains
  const sorted = matched.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // Exact match
    if (aName === queryLower) return -1;
    if (bName === queryLower) return 1;

    // Starts with
    if (aName.startsWith(queryLower) && !bName.startsWith(queryLower)) return -1;
    if (bName.startsWith(queryLower) && !aName.startsWith(queryLower)) return 1;

    // Contains (alphabetical)
    return aName.localeCompare(bName);
  });

  return sorted.slice(0, limit);
};

/**
 * Get emoji by id/name
 */
export const getEmojiById = (id: string): Emoji | undefined => {
  const emoji = TypedData.emojis[id];
  if (!emoji) return undefined;

  return {
    id,
    name: emoji.name,
    value: emoji.skins[0].native,
    keywords: emoji.keywords,
  };
};
