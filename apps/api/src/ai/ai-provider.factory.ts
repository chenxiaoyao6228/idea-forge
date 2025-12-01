/**
 * AI Provider Factory
 *
 * Maps LLM provider types to Vercel AI SDK creators.
 * Supports both official providers and OpenAI-compatible providers.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAzure } from "@ai-sdk/azure";
import { createCohere } from "@ai-sdk/cohere";
import { createMistral } from "@ai-sdk/mistral";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createXai } from "@ai-sdk/xai";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { createOllama } from "ollama-ai-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createQwen } from "qwen-ai-provider-v5";
import { LLMProviderType, PROVIDER_REGISTRY } from "@idea/contracts";
import type { WorkspaceAIProvider } from "@prisma/client";

// Type for provider creator functions
type ProviderCreator = typeof createOpenAI;

/**
 * Registry mapping provider types to their SDK creator functions.
 * OpenAI-compatible providers use createOpenAI with custom baseURL.
 */
export const AI_PROVIDER_CREATORS: Record<LLMProviderType, ProviderCreator> = {
  [LLMProviderType.OPENAI]: createOpenAI,
  [LLMProviderType.ANTHROPIC]: createAnthropic as unknown as ProviderCreator,
  [LLMProviderType.GOOGLE]: createGoogleGenerativeAI as unknown as ProviderCreator,
  [LLMProviderType.AZURE]: createAzure as unknown as ProviderCreator,
  [LLMProviderType.COHERE]: createCohere as unknown as ProviderCreator,
  [LLMProviderType.MISTRAL]: createMistral as unknown as ProviderCreator,
  [LLMProviderType.DEEPSEEK]: createDeepSeek as unknown as ProviderCreator,
  [LLMProviderType.XAI]: createXai as unknown as ProviderCreator,
  [LLMProviderType.TOGETHERAI]: createTogetherAI as unknown as ProviderCreator,
  [LLMProviderType.OLLAMA]: createOllama as unknown as ProviderCreator,
  [LLMProviderType.OPENROUTER]: createOpenRouter as unknown as ProviderCreator,
  [LLMProviderType.QWEN]: createQwen as unknown as ProviderCreator,
};

/**
 * Create a model instance from a workspace AI provider configuration.
 *
 * @param provider - The workspace AI provider with credentials
 * @param modelId - The model ID to use (e.g., "gpt-4o", "deepseek-ai/DeepSeek-V3")
 * @returns A language model instance that can be used with Vercel AI SDK
 */
export function createModelInstance(provider: WorkspaceAIProvider, modelId: string) {
  const providerType = provider.provider as LLMProviderType;
  const creator = AI_PROVIDER_CREATORS[providerType];

  if (!creator) {
    throw new Error(`Unsupported provider type: ${provider.provider}`);
  }

  // Get base URL from provider config or fallback to registry default
  const baseURL = provider.baseURL || PROVIDER_REGISTRY[providerType]?.defaultBaseURL;

  // Create the provider instance with credentials
  const providerInstance = creator({
    apiKey: provider.apiKey,
    baseURL: baseURL || undefined,
  });

  // Return the model instance
  return providerInstance(modelId);
}
