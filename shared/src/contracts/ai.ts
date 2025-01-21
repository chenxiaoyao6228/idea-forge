// streaming request
import { z } from "zod";

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

// token usage
export const TokenUsageSchema = z.object({
  email: z.string().email(),
  monthlyLimit: z.number().min(0),
  monthlyUsed: z.number().min(0),
  lastResetDate: z.date(),
});
export type TokenUsageData = z.infer<typeof TokenUsageSchema>;

export const UpdateUserTokenLimitSchema = z.object({
  email: z.string().email(),
  monthlyUsed: z.number().min(0),
  monthlyLimit: z.number().min(0),
});
export type UpdateUserTokenLimitData = z.infer<typeof UpdateUserTokenLimitSchema>;
