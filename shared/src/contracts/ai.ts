// streaming request
import { z } from "zod";
import { EmailSchema } from "./auth";

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

// ==============================================================
export const TokenUsageRequestSchema = z.object({
  email: EmailSchema,
});
export type TokenUsageRequest = z.infer<typeof TokenUsageRequestSchema>;

export const TokenUsageResponseSchema = z.object({
  email: EmailSchema,
  monthlyLimit: z.number().min(0),
  monthlyUsed: z.number().min(0),
  lastResetDate: z.date(),
});
export type TokenUsageResponse = z.infer<typeof TokenUsageResponseSchema>;

// ==============================================================
export const UpdateUserTokenLimitRequestSchema = z.object({
  email: EmailSchema,
  monthlyUsed: z.number().min(0),
  monthlyLimit: z.number().min(0),
});
export type UpdateUserTokenLimitRequest = z.infer<typeof UpdateUserTokenLimitRequestSchema>;
