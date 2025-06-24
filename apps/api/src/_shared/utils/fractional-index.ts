import fractionalIndex from "fractional-index";

export interface IndexCollisionOptions {
  workspaceId?: string;
  subspaceId?: string | null;
  parentId?: string | null;
}

export interface IndexItem {
  index: string | null;
}

/**
 * Generate a new fractional index for ordering items
 * @param prevIndex - The index of the previous item (or null for first position)
 * @param nextIndex - The index of the next item (or null for last position)
 * @returns A new fractional index string
 */
export function generateFractionalIndex(prevIndex: string | null, nextIndex: string | null): string {
  return fractionalIndex(prevIndex, nextIndex);
}

/**
 * Get the first item's index from a collection
 * @param items - Array of items with index property
 * @returns The index of the first item or null if no items exist
 */
export function getFirstItemIndex<T extends IndexItem>(items: T[]): string | null {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return null;
  }
  return items[0].index;
}

/**
 * Get the next item's index after a given index
 * @param items - Array of items with index property
 * @param currentIndex - The current index to find the next item after
 * @returns The index of the next item or null if no next item exists
 */
export function getNextItemIndex<T extends IndexItem>(items: T[], currentIndex: string): string | null {
  if (!items || !Array.isArray(items) || !currentIndex) {
    return null;
  }

  const currentItemIndex = items.findIndex((item) => item.index === currentIndex);
  if (currentItemIndex === -1 || currentItemIndex === items.length - 1) {
    return null;
  }
  return items[currentItemIndex + 1].index;
}

/**
 * Generate a new index for the first position
 * @param items - Array of items with index property
 * @returns A new fractional index string for the first position
 */
export function generateFirstPositionIndex<T extends IndexItem>(items: T[]): string {
  const firstIndex = getFirstItemIndex(items);
  return generateFractionalIndex(null, firstIndex);
}

/**
 * Handle index collision by finding a new valid index
 * @param items - Array of items with index property
 * @param index - The index that might have a collision
 * @returns A new non-colliding fractional index
 */
export function handleIndexCollision<T extends IndexItem>(items: T[], index: string): string {
  if (!items || !Array.isArray(items)) {
    return index;
  }

  const itemWithIndex = items.find((item) => item.index === index);
  if (!itemWithIndex) {
    return index;
  }

  const nextIndex = getNextItemIndex(items, index);
  return generateFractionalIndex(index, nextIndex);
}
