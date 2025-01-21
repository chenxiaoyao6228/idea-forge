import { fetchEventSource } from "@microsoft/fetch-event-source";

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

  async start(options: EventSourceOptions, handlers: EventSourceHandlers) {
    this.stop();
    this.abortController = new AbortController();
    this.retryCount = 0;

    const { url, method = "POST", body, headers = {}, maxRetries = 3, retryDelay = 1000 } = options;
    const { onMessage, onComplete, onError } = handlers;

    try {
      await fetchEventSource(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: this.abortController.signal,

        onmessage(msg) {
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

        onerror: (err) => {
          this.retryCount++;
          if (this.retryCount >= maxRetries) {
            onError?.({ code: "MAX_RETRIES", message: `Max retries (${maxRetries}) exceeded` });
            throw err;
          }
          return retryDelay;
        },
      });
    } catch (error: any) {
      onError?.({
        code: "CONNECTION_ERROR",
        message: error.message || "Connection failed",
      });
    }
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
