import type { LLMProviderType } from "@idea/contracts";

export interface AIProviderConfig {
  id: string;
  provider: LLMProviderType;
  apiKey: string;
  baseURL?: string | null;
  isActive: boolean;
  priority: number;
}

export interface AIRequestOptions {
  modelId: string;
  temperature?: number;
  max_tokens?: number;
}
