/**
 * Returns a random element from an array.
 * Uses Math.random() for randomization.
 *
 * @param list - The array to select from
 * @returns A random element from the array, or undefined if array is empty
 *
 * @example
 * ```typescript
 * const colors = ['red', 'blue', 'green'];
 * const randomColor = getRandomElement(colors);
 * console.log(randomColor); // 'blue' (or any other color)
 * ```
 */
export const getRandomElement = <T>(list: T[]): T | undefined => {
  if (list.length === 0) return undefined;
  return list[Math.floor(Math.random() * list.length)];
};
