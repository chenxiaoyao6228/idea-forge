import { v4 as uuid } from "uuid";

/**
 * Generates a UUID v4 string.
 * Uses the uuid library for cryptographically strong random values.
 *
 * @returns A UUID v4 string (e.g., "550e8400-e29b-41d4-a716-446655440000")
 *
 * @example
 * ```typescript
 * const id = generateUuid();
 * console.log(id); // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export const generateUuid = () => uuid();
