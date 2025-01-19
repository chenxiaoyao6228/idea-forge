export interface AIStreamRequest {
  messages: ChatMessage[];
  options?: {
    temperature?: number;
    max_tokens?: number;
  };
}

export interface AIStreamResponse {
  id: string;
  content: string;
  provider: string;
}

export type ChatMessage = {
  role: "system" | "assistant" | "user";
  content: string;
};
