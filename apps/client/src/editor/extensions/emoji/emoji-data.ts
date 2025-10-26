import data from "@emoji-mart/data";
import type { EmojiMartData } from "@emoji-mart/data";
import FuzzySearch from "fuzzy-search";

// Type-safe emoji data
const TypedData = data as EmojiMartData;

export enum EmojiCategory {
  Suggested = "Suggested",
  SmileysEmotion = "Smileys & Emotion",
  PeopleBody = "People & Body",
  AnimalsNature = "Animals & Nature",
  FoodDrink = "Food & Drink",
  TravelPlaces = "Travel & Places",
  Activities = "Activities",
  Objects = "Objects",
  Symbols = "Symbols",
  Flags = "Flags",
}

export interface Emoji {
  id: string;
  name: string;
  value: string; // The actual emoji character
  keywords?: string[];
  category?: EmojiCategory;
}

// Category mapping from emoji-mart to our categories
const CATEGORY_MAP: Record<string, EmojiCategory> = {
  "smileys-emotion": EmojiCategory.SmileysEmotion,
  "people-body": EmojiCategory.PeopleBody,
  "animals-nature": EmojiCategory.AnimalsNature,
  "food-drink": EmojiCategory.FoodDrink,
  "travel-places": EmojiCategory.TravelPlaces,
  activities: EmojiCategory.Activities,
  objects: EmojiCategory.Objects,
  symbols: EmojiCategory.Symbols,
  flags: EmojiCategory.Flags,
};

/**
 * Get category for an emoji ID
 */
const getCategoryForEmoji = (id: string): EmojiCategory => {
  const category = TypedData.categories.find((cat) => cat.emojis.includes(id));
  if (!category) return EmojiCategory.SmileysEmotion;
  return CATEGORY_MAP[category.id] || EmojiCategory.SmileysEmotion;
};

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
    category: getCategoryForEmoji(id),
  }));
};

// Cache all emojis and create fuzzy searcher
const allEmojis = getAllEmojis();
const fuzzySearcher = new FuzzySearch(allEmojis, ["name", "keywords"], {
  caseSensitive: false,
  sort: true,
});

// Most commonly used emojis (shown when no query)
const SUGGESTED_EMOJIS = [
  "grinning",
  "smiley",
  "smile",
  "grin",
  "laughing",
  "sweat_smile",
  "joy",
  "heart",
  "fire",
  "100",
  "thumbsup",
  "thumbsdown",
  "clap",
  "raised_hands",
  "pray",
  "rocket",
  "tada",
  "star",
  "sparkles",
  "eyes",
];

/**
 * Enhanced search with fuzzy matching
 * Searches in emoji name and keywords using fuzzy-search library
 */
export const searchEmojis = (query: string, limit = 15): Emoji[] => {
  if (!query) {
    // Return suggested emojis when no query
    const suggested = SUGGESTED_EMOJIS.map((id) => allEmojis.find((e) => e.id === id)).filter(Boolean) as Emoji[];
    return suggested.slice(0, limit);
  }

  const queryLower = query.toLowerCase();

  // Use fuzzy search
  let results = fuzzySearcher.search(queryLower);

  // Sort: exact match first, then starts-with, then fuzzy matches
  results = results.sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();

    // Exact match
    if (aName === queryLower) return -1;
    if (bName === queryLower) return 1;

    // Starts with
    if (aName.startsWith(queryLower) && !bName.startsWith(queryLower)) return -1;
    if (bName.startsWith(queryLower) && !aName.startsWith(queryLower)) return 1;

    // Keyword match
    const aKeywordMatch = a.keywords?.some((kw) => kw.toLowerCase() === queryLower);
    const bKeywordMatch = b.keywords?.some((kw) => kw.toLowerCase() === queryLower);
    if (aKeywordMatch && !bKeywordMatch) return -1;
    if (bKeywordMatch && !aKeywordMatch) return 1;

    // Alphabetical
    return aName.localeCompare(bName);
  });

  return results.slice(0, limit);
};

/**
 * Get emojis by category
 */
export const getEmojisByCategory = (category: EmojiCategory): Emoji[] => {
  if (category === EmojiCategory.Suggested) {
    return SUGGESTED_EMOJIS.map((id) => allEmojis.find((e) => e.id === id)).filter(Boolean) as Emoji[];
  }
  return allEmojis.filter((emoji) => emoji.category === category);
};

/**
 * Get all categories with emoji counts
 */
export const getCategories = (): Array<{ category: EmojiCategory; count: number }> => {
  const categoryCounts = new Map<EmojiCategory, number>();

  // Add suggested category
  categoryCounts.set(EmojiCategory.Suggested, SUGGESTED_EMOJIS.length);

  // Count emojis in each category
  allEmojis.forEach((emoji) => {
    const count = categoryCounts.get(emoji.category!) || 0;
    categoryCounts.set(emoji.category!, count + 1);
  });

  return Array.from(categoryCounts.entries()).map(([category, count]) => ({
    category,
    count,
  }));
};

/**
 * Get emoji by id/name
 */
export const getEmojiById = (id: string): Emoji | undefined => {
  return allEmojis.find((e) => e.id === id);
};
