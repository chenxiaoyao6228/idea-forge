/**
 * Converts a promise to an error-first tuple pattern, similar to Go's error handling.
 * Returns [error, null] on rejection or [null, data] on resolution.
 *
 * @param promise - The promise to convert
 * @returns A promise that always resolves to a tuple [error | null, data | null]
 *
 * @example
 * ```typescript
 * const [error, data] = await toAsync(fetchUser(id));
 *
 * if (error) {
 *   console.error('Failed to fetch user:', error);
 *   return;
 * }
 *
 * console.log('User:', data);
 * ```
 */
export function toAsync<T, U = any>(promise: Promise<T>): Promise<[U | null, T | null]> {
  return promise.then<[null, T]>((data: T) => [null, data]).catch<[U, null]>((err) => [err, null]);
}
