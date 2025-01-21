import useUserStore from "@/stores/user";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import axios from "axios";

interface EventSourceOptions {
  url: string;
  method?: "GET" | "POST";
  body?: any;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
}

interface EventSourceHandlers {
  onMessage?: (data: any) => void;
  onComplete?: () => void;
  onError?: (error: { code: string; message: string }) => void;
}

export class EventSourceService {
  private abortController: AbortController | null = null;
  private retryCount = 0;
  private isRefreshing = false;

  async start(options: EventSourceOptions, handlers: EventSourceHandlers) {
    this.stop();
    this.abortController = new AbortController();
    this.retryCount = 0;

    const { url, method = "POST", body, headers = {}, maxRetries = 3, retryDelay = 1000 } = options;
    const { onMessage, onComplete, onError } = handlers;

    const startEventSource = async (retryOptions?: EventSourceOptions) => {
      try {
        await fetchEventSource(retryOptions?.url || url, {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(retryOptions?.headers || headers),
          },
          body: retryOptions?.body ? JSON.stringify(retryOptions.body) : body ? JSON.stringify(body) : undefined,
          signal: this.abortController!.signal,

          // Have to check content-type and throw error for auth error here
          onopen: async (response) => {
            const contentType = response.headers.get("content-type");
            if (!contentType?.includes("text/event-stream")) {
              throw await response.json();
            }
          },

          onmessage: (msg) => {
            if (msg.event === "error") {
              try {
                const errorData = JSON.parse(msg.data);
                onError?.(errorData);
                return;
              } catch (err) {
                console.error("Failed to parse error message:", err);
              }
            }

            if (msg.event === "complete") {
              onComplete?.();
              return;
            }

            try {
              const data = JSON.parse(msg.data);
              onMessage?.(data);
            } catch (err) {
              console.error("Failed to parse message:", err);
            }
          },

          onerror: (err: any) => {
            console.error("EventSource onerror:", err);
            if (err.statusCode === 401) {
              // throw error to stop retrying
              throw err;
            }

            this.retryCount++;
            if (this.retryCount >= maxRetries) {
              onError?.({ code: "MAX_RETRIES", message: `Max retries (${maxRetries}) exceeded` });
              throw err;
            }
            return retryDelay;
          },
        });
      } catch (error: any) {
        console.error("EventSource error:", error);

        if (error.statusCode === 401) {
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            try {
              await axios.post("/api/auth/refresh", null, { withCredentials: true });
              this.isRefreshing = false;
              await startEventSource(options);
            } catch (err) {
              this.isRefreshing = false;
              useUserStore.getState().logout();
              const currentPath = window.location.pathname;
              window.location.href = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
              throw err;
            }
            return;
          }
        }

        onError?.({
          code: "CONNECTION_ERROR",
          message: error.message || "Connection failed",
        });
      }
    };

    await startEventSource();
  }

  stop() {
    this.abortController?.abort();
    this.abortController = null;
    this.retryCount = 0;
  }

  isActive() {
    return this.abortController !== null;
  }
}
