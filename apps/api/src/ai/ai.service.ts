import { Injectable, forwardRef, Inject as NestInject } from "@nestjs/common";
import { streamText } from "ai";
import { Subject, Observable } from "rxjs";
import { AIStreamResponse, AIStreamRequest, PROVIDER_REGISTRY, type WorkspaceAIProvider, parseModelsString } from "@idea/contracts";
import { TokenUsageService } from "./token-usage.service";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { Inject } from "@nestjs/common";
import { WorkspaceAIConfigService } from "@/workspace/workspace-ai-config.service";
import { createModelInstance } from "./ai-provider.factory";

@Injectable()
export class AIProviderService {
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;

  constructor(
    private tokenUsageService: TokenUsageService,
    @NestInject(forwardRef(() => WorkspaceAIConfigService))
    private workspaceAIConfigService: WorkspaceAIConfigService,
  ) {}

  /**
   * Check if a provider can serve a specific model
   */
  private providerCanServeModel(provider: WorkspaceAIProvider, modelId: string): boolean {
    // If no models specified, provider can serve any model
    if (!provider.models) return true;

    const providerModels = parseModelsString(provider.models);
    return providerModels.includes(modelId);
  }

  /**
   * Get eligible providers for a specific model
   * Returns providers sorted by priority (lower = try first)
   */
  private async getEligibleProviders(workspaceId: string, modelId: string): Promise<WorkspaceAIProvider[]> {
    const activeProviders = await this.workspaceAIConfigService.getActiveProviders(workspaceId);
    return activeProviders.filter((p) => this.providerCanServeModel(p, modelId));
  }

  /**
   * Get default model from workspace providers
   * Returns the first model from the highest priority provider
   */
  private async getDefaultModel(workspaceId: string): Promise<string | undefined> {
    const providers = await this.workspaceAIConfigService.getActiveProviders(workspaceId);

    for (const provider of providers) {
      if (provider.models) {
        const models = parseModelsString(provider.models);
        if (models.length > 0) {
          return models[0];
        }
      }
    }

    return undefined;
  }

  /**
   * Stream completion with model-based provider failover using Vercel AI SDK
   *
   * Flow:
   * 1. Member selects a model (e.g., "gpt-4o") or system uses default
   * 2. System finds all providers that can serve this model
   * 3. Providers are sorted by priority (lower number = higher priority)
   * 4. Try each provider in order until one succeeds
   */
  async streamCompletion(request: AIStreamRequest, userId: string, workspaceId?: string): Promise<Observable<AIStreamResponse>> {
    const subject = new Subject<AIStreamResponse>();

    try {
      if (!workspaceId) {
        subject.error(new Error("Workspace ID is required. Please ensure you are in a workspace context."));
        subject.complete();
        return subject.asObservable();
      }

      // Get the model ID from request or use first available model from workspace
      let modelId = request.modelId;
      if (!modelId) {
        modelId = await this.getDefaultModel(workspaceId);
        if (!modelId) {
          subject.error(new Error("No models configured for this workspace. Please add models to your AI providers in workspace settings."));
          subject.complete();
          return subject.asObservable();
        }
        this.logger.info(`No model specified, using default model: ${modelId}`);
      }

      // Get providers that can serve this model
      const providers = await this.getEligibleProviders(workspaceId, modelId);

      if (providers.length === 0) {
        subject.error(
          new Error(`No providers configured for model "${modelId}". Please ask the admin to configure a provider with this model in workspace settings.`),
        );
        subject.complete();
        return subject.asObservable();
      }

      this.logger.info(
        `Found ${providers.length} provider(s) for model "${modelId}" in workspace ${workspaceId}: ${providers.map((p) => p.provider).join(", ")}`,
      );

      // Try providers with failover
      const tryProvider = async (providerIndex: number) => {
        if (providerIndex >= providers.length) {
          subject.error(new Error(`All providers failed for model "${modelId}". Please check your provider configurations.`));
          subject.complete();
          return;
        }

        const provider = providers[providerIndex];
        const providerName = PROVIDER_REGISTRY[provider.provider]?.name || provider.provider;

        this.logger.info(`Trying provider ${providerName} (priority: ${provider.priority}) for model ${modelId}`);

        try {
          // Create model instance using Vercel AI SDK
          const model = createModelInstance(provider, modelId!);

          // Stream using Vercel AI SDK
          const { textStream, usage } = streamText({
            model,
            messages: request.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            temperature: request.options?.temperature ?? 0.7,
            maxOutputTokens: request.options?.max_tokens ?? 1000,
          });

          // Stream chunks to subject
          for await (const chunk of textStream) {
            if (chunk) {
              subject.next({
                id: provider.id!,
                content: chunk,
                provider: providerName,
              });
            }
          }

          // Handle token usage after stream completes
          const finalUsage = await usage;
          if (finalUsage?.totalTokens) {
            this.logger.info(`Token usage for provider ${providerName}: ${finalUsage.totalTokens} tokens`);
            await this.tokenUsageService.updateTokenUsage(userId, finalUsage.totalTokens);
          }

          this.logger.info(`Successfully completed request with provider ${providerName}`);
          subject.complete();
        } catch (error: any) {
          this.logger.error(`Provider ${providerName} failed for model ${modelId}:`, {
            error: error.message,
            status: error.status,
            code: error.code,
          });

          // Try next provider
          if (providerIndex + 1 < providers.length) {
            this.logger.info(`Failing over to next provider...`);
          }
          await tryProvider(providerIndex + 1);
        }
      };

      tryProvider(0);
      return subject.asObservable();
    } catch (error: any) {
      subject.error(error);
      subject.complete();
      return subject.asObservable();
    }
  }
}
