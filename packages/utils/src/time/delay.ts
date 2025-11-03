/**
 * Creates a promise that resolves after a specified number of milliseconds.
 * Useful for implementing timeouts, debouncing, or adding delays in async code.
 *
 * @param ms - Number of milliseconds to delay
 * @returns A promise that resolves after the specified delay
 *
 * @example
 * ```typescript
 * // Wait for 1 second
 * await delay(1000);
 * console.log('1 second has passed');
 *
 * // Use in animations or polling
 * while (isLoading) {
 *   await delay(100);
 *   checkStatus();
 * }
 * ```
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
