type DocumentContent = Buffer | Record<string, unknown> | null;

/**
 * Result of change summary calculation
 */
interface ChangeSummary {
  charsAdded: number;
  charsRemoved: number;
  totalChange: number;
}

/**
 * Check if changes between two document versions exceed a character threshold
 * Uses Levenshtein distance to measure the difference
 *
 * @param beforeContent - Previous document content (Yjs binary or JSON)
 * @param afterContent - Current document content (Yjs binary or JSON)
 * @param threshold - Minimum number of character changes to return true (default: 5)
 * @returns true if changes exceed threshold, false otherwise
 */
export function isChangeOverThreshold(beforeContent: DocumentContent, afterContent: DocumentContent, threshold = 5): boolean {
  if (!beforeContent || !afterContent) {
    return false;
  }

  try {
    // Convert to plain text for comparison
    const beforeText = toPlainText(beforeContent);
    const afterText = toPlainText(afterContent);

    // Calculate Levenshtein distance (character difference)
    const distance = calculateLevenshteinDistance(beforeText, afterText, threshold + 1);

    return distance > threshold;
  } catch (error) {
    // If conversion fails, assume significant change
    console.error("[document-diff] Error calculating difference:", error);
    return true;
  }
}

/**
 * Get a preview of what changed between two versions
 * Returns a simple diff summary based on character count differences
 *
 * @param beforeContent - Previous document content
 * @param afterContent - Current document content
 * @returns Object with charsAdded, charsRemoved, and totalChange
 */
export function getChangeSummary(beforeContent: DocumentContent, afterContent: DocumentContent): ChangeSummary {
  if (!beforeContent || !afterContent) {
    return { charsAdded: 0, charsRemoved: 0, totalChange: 0 };
  }

  try {
    const beforeText = toPlainText(beforeContent);
    const afterText = toPlainText(afterContent);

    const charsAdded = Math.max(0, afterText.length - beforeText.length);
    const charsRemoved = Math.max(0, beforeText.length - afterText.length);
    const totalChange = Math.abs(afterText.length - beforeText.length);

    return { charsAdded, charsRemoved, totalChange };
  } catch (error) {
    console.error("[document-diff] Error calculating change summary:", error);
    return { charsAdded: 0, charsRemoved: 0, totalChange: 0 };
  }
}

/**
 * Convert document content to plain text
 * Handles both Yjs binary format and ProseMirror JSON
 *
 * @param content - Document content to convert
 * @returns Plain text representation of the document
 */
function toPlainText(content: DocumentContent): string {
  if (!content) {
    return "";
  }

  try {
    // If it's a Buffer (Yjs binary), we can't easily convert without Y.js
    // For now, return empty string - this means we rely on JSON content comparison
    // TODO: If needed in the future, integrate Y.js to parse binary format
    if (Buffer.isBuffer(content)) {
      return "";
    }

    // If it's JSON (ProseMirror format), extract text
    if (typeof content === "object") {
      return extractTextFromJSON(content);
    }

    return "";
  } catch (error) {
    console.error("[document-diff] Error converting to plain text:", error);
    return "";
  }
}

/**
 * Extract plain text from ProseMirror JSON structure
 * Recursively traverses the document tree and concatenates text nodes
 *
 * @param json - ProseMirror JSON node
 * @returns Concatenated text content
 */
function extractTextFromJSON(json: unknown): string {
  if (!json || typeof json !== "object") {
    return "";
  }

  const node = json as Record<string, unknown>;

  // If it's a text node, return its text
  if (node.type === "text" && typeof node.text === "string") {
    return node.text;
  }

  // If it has content array, recursively process children
  if (Array.isArray(node.content)) {
    return node.content.map((childNode) => extractTextFromJSON(childNode)).join("");
  }

  return "";
}

/**
 * Calculate Levenshtein distance between two strings
 * Optimized version with early termination if distance exceeds maxDistance
 *
 * This algorithm measures the minimum number of single-character edits
 * (insertions, deletions, or substitutions) required to change one string into another
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @param maxDistance - Maximum distance to calculate (for optimization)
 * @returns Distance between strings (number of character changes)
 */
function calculateLevenshteinDistance(str1: string, str2: string, maxDistance = Number.POSITIVE_INFINITY): number {
  const len1 = str1.length;
  const len2 = str2.length;

  // Quick checks for edge cases
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  if (str1 === str2) return 0;

  // Create distance matrix (only need 2 rows for space optimization)
  let prevRow = Array.from({ length: len2 + 1 }, (_, i) => i);
  let currRow = new Array(len2 + 1);

  for (let i = 1; i <= len1; i++) {
    currRow[0] = i;
    let minInRow = i;

    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // deletion
        currRow[j - 1] + 1, // insertion
        prevRow[j - 1] + cost, // substitution
      );
      minInRow = Math.min(minInRow, currRow[j]);
    }

    // Early termination optimization: if minimum in this row exceeds maxDistance,
    // we know the final distance will exceed maxDistance
    if (minInRow > maxDistance) {
      return maxDistance + 1;
    }

    // Swap rows for next iteration
    [prevRow, currRow] = [currRow, prevRow];
  }

  return prevRow[len2];
}
