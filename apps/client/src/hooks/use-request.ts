import { useState } from "react";
import { useRefCallback } from "./use-ref-callback";

// Custom hook that handles loading states elegantly
export const useRequest = <T, P extends any[]>(
  requestFn: (...args: P) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    enabled?: boolean;
  } = {},
) => {
  const [state, setState] = useState<{
    data: T | null;
    isLoading: boolean;
    error: Error | null;
  }>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useRefCallback(async (...args: P) => {
    // Check if the request is enabled
    if (options.enabled === false) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await requestFn(...args);
      setState({ data, isLoading: false, error: null });
      options.onSuccess?.(data);
      return data;
    } catch (error) {
      const err = error as Error;
      setState((prev) => ({ ...prev, isLoading: false, error: err }));
      options.onError?.(err);
      throw err;
    }
  });

  return {
    ...state,
    execute,
    refetch: execute,
  };
};
