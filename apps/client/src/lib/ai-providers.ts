import { LLMProviderType, PROVIDER_REGISTRY, type LLMProviderMetadata, type ProviderMetadata } from "@idea/contracts";

/**
 * Convert provider registry entry to LLM provider metadata for UI
 */
function registryEntryToMetadata(type: LLMProviderType, entry: ProviderMetadata): LLMProviderMetadata {
  return {
    value: type,
    label: entry.name,
    baseUrlPlaceholder: entry.defaultBaseURL,
    modelsPlaceholder: entry.modelsPlaceholder,
    requiresApiKey: entry.requiresApiKey,
  };
}

/**
 * Metadata for all supported LLM providers
 * Derived from PROVIDER_REGISTRY in contracts
 */
export const LLM_PROVIDERS: LLMProviderMetadata[] = (Object.keys(PROVIDER_REGISTRY) as LLMProviderType[]).map((type) =>
  registryEntryToMetadata(type, PROVIDER_REGISTRY[type]),
);

/**
 * Get provider metadata by type
 */
export function getProviderMetadata(providerType: LLMProviderType | string): LLMProviderMetadata | undefined {
  return LLM_PROVIDERS.find((p) => p.value === providerType);
}

/**
 * Get provider label by type
 */
export function getProviderLabel(providerType: LLMProviderType | string): string {
  return PROVIDER_REGISTRY[providerType as LLMProviderType]?.name || providerType;
}

/**
 * Get default base URL for a provider
 */
export function getProviderDefaultBaseURL(providerType: LLMProviderType | string): string {
  return PROVIDER_REGISTRY[providerType as LLMProviderType]?.defaultBaseURL || "";
}

/**
 * Check if provider requires API key
 */
export function providerRequiresApiKey(providerType: LLMProviderType | string): boolean {
  return PROVIDER_REGISTRY[providerType as LLMProviderType]?.requiresApiKey ?? true;
}
