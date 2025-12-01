// streaming request
import { z } from "zod";
import { EmailSchema } from "./auth";

export interface AIStreamRequest {
  messages: ChatMessage[];
  modelId?: string; // Model ID to use (e.g., "gpt-4o", "deepseek-ai/DeepSeek-V3")
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
// LLM Provider Configuration
// ==============================================================

export enum LLMProviderType {
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  GOOGLE = "google",
  AZURE = "azure",
  COHERE = "cohere",
  MISTRAL = "mistral",
  DEEPSEEK = "deepseek",
  QWEN = "qwen",
  XAI = "xai",
  TOGETHERAI = "togetherai",
  OLLAMA = "ollama",
  OPENROUTER = "openrouter",
}

// ==============================================================
// Provider Registry - Metadata only (no hardcoded models)
// ==============================================================

export interface ProviderMetadata {
  name: string;
  defaultBaseURL: string;
  requiresApiKey: boolean;
  modelsPlaceholder?: string; // Hint for UI autocomplete
  presetModels?: string[]; // Preset models for UI selection
}

export const PROVIDER_REGISTRY: Record<LLMProviderType, ProviderMetadata> = {
  [LLMProviderType.OPENAI]: {
    name: "OpenAI",
    defaultBaseURL: "https://api.openai.com/v1",
    requiresApiKey: true,
    modelsPlaceholder: "gpt-4o, gpt-4o-mini, gpt-4-turbo, o1, o1-mini",
    presetModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "o1", "o1-mini", "o1-preview", "o3-mini"],
  },
  [LLMProviderType.ANTHROPIC]: {
    name: "Anthropic",
    defaultBaseURL: "https://api.anthropic.com/v1",
    requiresApiKey: true,
    modelsPlaceholder: "claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022, claude-3-opus-20240229",
    presetModels: ["claude-sonnet-4-20250514", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  },
  [LLMProviderType.DEEPSEEK]: {
    name: "DeepSeek",
    defaultBaseURL: "https://api.deepseek.com/v1",
    requiresApiKey: true,
    modelsPlaceholder: "deepseek-chat, deepseek-reasoner, deepseek-coder",
    presetModels: ["deepseek-chat", "deepseek-reasoner", "deepseek-coder"],
  },
  [LLMProviderType.GOOGLE]: {
    name: "Google Gemini",
    defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta",
    requiresApiKey: true,
    modelsPlaceholder: "gemini-1.5-pro, gemini-1.5-flash, gemini-2.0-flash-exp",
    presetModels: ["gemini-2.0-flash-exp", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-8b"],
  },
  [LLMProviderType.AZURE]: {
    name: "Azure OpenAI",
    defaultBaseURL: "https://your-resource.openai.azure.com",
    requiresApiKey: true,
    modelsPlaceholder: "gpt-4, gpt-4-turbo, gpt-35-turbo",
    presetModels: ["gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-35-turbo"],
  },
  [LLMProviderType.MISTRAL]: {
    name: "Mistral AI",
    defaultBaseURL: "https://api.mistral.ai/v1",
    requiresApiKey: true,
    modelsPlaceholder: "mistral-large-latest, mistral-small-latest, codestral-latest",
    presetModels: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "codestral-latest"],
  },
  [LLMProviderType.COHERE]: {
    name: "Cohere",
    defaultBaseURL: "https://api.cohere.ai/v1",
    requiresApiKey: true,
    modelsPlaceholder: "command-r-plus, command-r, command",
    presetModels: ["command-r-plus", "command-r", "command", "command-light"],
  },
  [LLMProviderType.QWEN]: {
    name: "Qwen (Alibaba)",
    defaultBaseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    requiresApiKey: true,
    modelsPlaceholder: "qwen-turbo, qwen-plus, qwen-max, qwen-coder-turbo",
    presetModels: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-coder-turbo", "qwen-coder-plus"],
  },
  [LLMProviderType.XAI]: {
    name: "xAI (Grok)",
    defaultBaseURL: "https://api.x.ai/v1",
    requiresApiKey: true,
    modelsPlaceholder: "grok-beta, grok-vision-beta",
    presetModels: ["grok-beta", "grok-vision-beta", "grok-2", "grok-2-mini"],
  },
  [LLMProviderType.TOGETHERAI]: {
    name: "Together AI",
    defaultBaseURL: "https://api.together.xyz/v1",
    requiresApiKey: true,
    modelsPlaceholder: "meta-llama/Llama-3.3-70B-Instruct-Turbo, Qwen/Qwen2.5-72B-Instruct-Turbo",
    presetModels: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1"],
  },
  [LLMProviderType.OLLAMA]: {
    name: "Ollama (Local)",
    defaultBaseURL: "http://localhost:11434/v1",
    requiresApiKey: false,
    modelsPlaceholder: "llama3, llama3.2, mistral, codellama, qwen2.5-coder",
    presetModels: ["llama3.2", "llama3.1", "llama3", "mistral", "codellama", "qwen2.5-coder"],
  },
  [LLMProviderType.OPENROUTER]: {
    name: "OpenRouter",
    defaultBaseURL: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    modelsPlaceholder: "openai/gpt-4o, anthropic/claude-3-opus, meta-llama/llama-3-70b",
    presetModels: ["openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "anthropic/claude-3-opus"],
  },
};

// ==============================================================
// Workspace AI Provider Validation Schemas
// Note: The base WorkspaceAIProvider type is generated by Prisma
// These schemas add validation with LLMProviderType enum
// ==============================================================

// Internal schema with enum validation (not exported to avoid Prisma conflict)
const WorkspaceAIProviderValidationSchema = z.object({
  id: z.string().cuid().optional(),
  workspaceId: z.string().cuid(),
  provider: z.nativeEnum(LLMProviderType),
  name: z.string().optional().nullable(), // Display name (required for custom providers)
  apiKey: z.string().min(1, "API key is required"),
  baseURL: z.string().url().optional().nullable(),
  models: z.string().optional().nullable(), // Comma-separated model IDs (e.g., "gpt-4o,gpt-4o-mini")
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).default(0), // Lower number = higher priority
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Create DTO (full, includes workspaceId)
export const CreateWorkspaceAIProviderSchema = WorkspaceAIProviderValidationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateWorkspaceAIProviderDto = z.infer<typeof CreateWorkspaceAIProviderSchema>;

// Create DTO for request body (without workspaceId - it comes from URL path)
export const CreateWorkspaceAIProviderBodySchema = WorkspaceAIProviderValidationSchema.omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateWorkspaceAIProviderBody = z.infer<typeof CreateWorkspaceAIProviderBodySchema>;

// Update DTO
export const UpdateWorkspaceAIProviderSchema = WorkspaceAIProviderValidationSchema.omit({
  id: true,
  workspaceId: true,
  provider: true, // Provider type cannot be changed
  createdAt: true,
  updatedAt: true,
}).partial();

export type UpdateWorkspaceAIProviderDto = z.infer<typeof UpdateWorkspaceAIProviderSchema>;

// Public provider (without sensitive data) - uses string for provider to match Prisma type
export const PublicWorkspaceAIProviderSchema = z.object({
  id: z.string().cuid().optional(),
  workspaceId: z.string().cuid(),
  provider: z.string(), // Use string to match Prisma generated type
  name: z.string().optional().nullable(),
  baseURL: z.string().url().optional().nullable(),
  models: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type PublicWorkspaceAIProvider = z.infer<typeof PublicWorkspaceAIProviderSchema>;

// ==============================================================
// Helper functions for parsing models
// ==============================================================

/**
 * Parse comma-separated models string into array
 */
export function parseModelsString(models: string | null | undefined): string[] {
  if (!models) return [];
  return models
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

/**
 * Convert models array to comma-separated string
 */
export function modelsToString(models: string[]): string {
  return models.join(",");
}

/**
 * Get all unique models from providers
 */
export function getAllModelsFromProviders(providers: Array<{ models?: string | null }>): string[] {
  const models = new Set<string>();
  for (const provider of providers) {
    if (provider.models) {
      for (const model of parseModelsString(provider.models)) {
        models.add(model);
      }
    }
  }
  return Array.from(models);
}

// ==============================================================
// Provider metadata for frontend UI
// ==============================================================

export interface LLMProviderMetadata {
  value: LLMProviderType;
  label: string;
  baseUrlPlaceholder?: string;
  modelsPlaceholder?: string;
  requiresApiKey: boolean;
}

// ==============================================================
// Token Usage
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
