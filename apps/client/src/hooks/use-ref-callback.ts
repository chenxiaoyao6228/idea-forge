import { useCallback, useRef } from "react";

/**
 * A hook that creates a stable callback reference that always points to the latest version of the callback.
 * This is useful when you need to pass a callback to child components or event handlers that might
 * reference stale closure values.
 *
 * @template T - The function type to wrap
 * @param callback - The callback function to stabilize
 * @returns A stable callback that always calls the latest version of the provided callback
 *
 * @example
 * ```typescript
 * const fetchData = useRefCallback(async (page: number, size: number) => {
 *   // This function will always have access to the latest state values
 *   const result = await api.getData(page, size);
 *   setData(result);
 * });
 * ```
 */
export function useRefCallback<T extends (...args: never[]) => unknown>(callback: T): T {
  const callbackRef = useRef<T>(callback);

  // Update the ref to always point to the latest callback
  callbackRef.current = callback;

  // Return a stable callback that calls the current version
  return useCallback((...args: Parameters<T>) => {
    return callbackRef.current(...args);
  }, []) as T;
}
