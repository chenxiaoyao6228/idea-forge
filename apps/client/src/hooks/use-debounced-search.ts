import { useState } from "react";
import { useDebounce } from "react-use";
import { useRefCallback } from "./use-ref-callback";

/**
 * A hook that provides debounced search functionality for modals and search components.
 * This prevents the flashing effect that occurs when search results update on every keystroke.
 *
 * @param initialQuery - Initial search query value
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @returns Object containing current query, debounced query, and query setter
 *
 * @example
 * ```typescript
 * const { query, debouncedQuery, setQuery } = useDebouncedSearch("", 300);
 *
 * // Use query for immediate UI updates (input value)
 * // Use debouncedQuery for API calls and search results
 * ```
 */
export function useDebouncedSearch(initialQuery = "", debounceMs = 300) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Debounce the query to prevent excessive API calls
  useDebounce(
    () => {
      setDebouncedQuery(query);
    },
    debounceMs,
    [query],
  );

  // Reset both queries when needed
  const resetQuery = useRefCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  });

  return {
    query,
    debouncedQuery,
    setQuery,
    resetQuery,
  };
}
