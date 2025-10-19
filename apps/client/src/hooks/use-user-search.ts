import { useState, useCallback, useRef } from "react";
import { userApi } from "@/apis/user";
import { displayUserName } from "@/lib/auth";
import type { User } from "@idea/contracts";
import type { Option } from '@/components/ui/multi-selector';

// Custom hook for async user search following React Client patterns
export function useUserSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const searchCacheRef = useRef<Map<string, Option[]>>(new Map());

  const searchUsers = useCallback(async (query: string): Promise<Option[]> => {
    const cacheKey = query.toLowerCase().trim();

    // Check cache first
    if (searchCacheRef.current.has(cacheKey)) {
      return searchCacheRef.current.get(cacheKey)!;
    }

    setIsSearching(true);
    try {
      const response = await userApi.search({
        query: query || "", // Allow empty queries for initial load
        page: 1,
        limit: 50,
        sortBy: "createdAt",
      });

      // Handle both possible response structures
      let users: User[] = [];
      if (response && typeof response === "object" && "data" in response) {
        users = (response.data as User[]) || [];
      } else {
        users = (response as User[]) || [];
      }

      const options: Option[] = users.map((user) => ({
        value: user.id,
        label: `${displayUserName(user)} (${user.email})`,
        // Store additional user data as string properties for compatibility
        email: user.email,
        imageUrl: user.imageUrl || undefined,
      }));

      // Cache the results
      searchCacheRef.current.set(cacheKey, options);
      return options;
    } catch (error) {
      console.error("Failed to search users:", error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearCache = useCallback(() => {
    searchCacheRef.current.clear();
  }, []);

  return {
    isSearching,
    searchUsers,
    clearCache,
  };
}
