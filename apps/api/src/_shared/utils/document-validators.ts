/**
 * Document ID Validation Utilities
 *
 * Provides validation functions for document identifiers to ensure
 * they match expected patterns (CUID format).
 */

/**
 * Regular expression pattern for CUID validation
 * CUID format: starts with 'c' followed by 24 alphanumeric characters
 * Example: cmglyhzzn0001c6nvnrw61j0s
 */
const CUID_PATTERN = /^c[a-z0-9]{24}$/;

/**
 * Validates if a string is a valid document ID (CUID format)
 *
 * @param id - The string to validate
 * @returns true if the string matches CUID pattern, false otherwise
 *
 * @example
 * ```typescript
 * isValidDocumentId('cmglyhzzn0001c6nvnrw61j0s'); // true
 * isValidDocumentId('invalid-id'); // false
 * isValidDocumentId('c123'); // false (too short)
 * isValidDocumentId('dmglyhzzn0001c6nvnrw61j0s'); // false (wrong prefix)
 * ```
 */
export function isValidDocumentId(id: string): boolean {
  if (!id || typeof id !== "string") {
    return false;
  }
  return CUID_PATTERN.test(id);
}

/**
 * Extracts document ID from a URL path if present
 * Supports multiple URL patterns:
 * - Direct document ID: /:docId
 * - Workspace document: /workspace/:workspaceId/doc/:docId
 *
 * @param path - The URL path to parse
 * @returns Document ID if found and valid, null otherwise
 *
 * @example
 * ```typescript
 * extractDocumentIdFromPath('/cmglyhzzn0001c6nvnrw61j0s');
 * // Returns: 'cmglyhzzn0001c6nvnrw61j0s'
 *
 * extractDocumentIdFromPath('/workspace/cmgh1234/doc/cmglyhzzn0001c6nvnrw61j0s');
 * // Returns: 'cmglyhzzn0001c6nvnrw61j0s'
 *
 * extractDocumentIdFromPath('/invalid-path');
 * // Returns: null
 * ```
 */
export function extractDocumentIdFromPath(path: string): string | null {
  if (!path || typeof path !== "string") {
    return null;
  }

  // Pattern 1: Direct document ID (/:docId)
  const directMatch = path.match(/^\/([a-z0-9]{25})$/);
  if (directMatch && isValidDocumentId(directMatch[1])) {
    return directMatch[1];
  }

  // Pattern 2: Workspace document URL (/workspace/:workspaceId/doc/:docId)
  const workspaceMatch = path.match(/^\/workspace\/[^/]+\/doc\/([a-z0-9]{25})$/);
  if (workspaceMatch && isValidDocumentId(workspaceMatch[1])) {
    return workspaceMatch[1];
  }

  return null;
}
