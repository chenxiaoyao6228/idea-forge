import { useState, useRef, useCallback } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";

interface EventSourceOptions {
  url: string;
  onData: (data: any) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  body?: any;
  maxRetries?: number;
  retryDelay?: number;
}

class RetriableError extends Error {}
class FatalError extends Error {}

export function useEventSource() {
  const [isStreaming, setIsStreaming] = useState(false);
  const isCompleteRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    isCompleteRef.current = false;
    retryCountRef.current = 0;
  }, []);

  const start = useCallback(
    async ({ url, onData, onError, onComplete, headers = {}, method = "POST", body, maxRetries = 3, retryDelay = 1000 }: EventSourceOptions) => {
      stop();
      setIsStreaming(true);
      isCompleteRef.current = false;

      abortControllerRef.current = new AbortController();

      try {
        await fetchEventSource(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: abortControllerRef.current.signal,
          openWhenHidden: true,

          async onopen(response) {
            if (response.ok && response.headers.get("content-type")?.includes("text/event-stream")) {
              retryCountRef.current = 0;
              return;
            }
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
              throw new FatalError();
            }
            throw new RetriableError();
          },

          onmessage(msg) {
            if (msg.event === "complete") {
              isCompleteRef.current = true;
              onComplete?.();
              return;
            }

            try {
              const data = JSON.parse(msg.data);
              onData(data);
            } catch (err) {
              console.error("Failed to parse message:", err);
            }
          },

          onclose() {
            if (!isCompleteRef.current) {
              if (retryCountRef.current >= maxRetries) {
                onError?.(new Error(`Max retries (${maxRetries}) exceeded`));
                return;
              }
              throw new RetriableError();
            }
          },

          onerror(err) {
            if (err instanceof FatalError) {
              onError?.(err);
              throw err;
            }

            retryCountRef.current += 1;
            if (retryCountRef.current >= maxRetries) {
              onError?.(new Error(`Max retries (${maxRetries}) exceeded`));
              throw err;
            }

            return retryDelay;
          },
        });
      } catch (error) {
        onError?.(error as Error);
      } finally {
        setIsStreaming(false);
      }
    },
    [],
  );

  return {
    isStreaming,
    isComplete: isCompleteRef.current,
    start,
    stop,
  };
}
