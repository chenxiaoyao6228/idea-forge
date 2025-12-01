import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import type { CreateWorkspaceAIProviderDto, PublicWorkspaceAIProvider, UpdateWorkspaceAIProviderDto, LLMProviderType } from "@idea/contracts";
import { PROVIDER_REGISTRY, getAllModelsFromProviders } from "@idea/contracts";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { EncryptionService } from "@/_shared/utils/encryption.service";
import type { WorkspaceAIProvider as PrismaWorkspaceAIProvider, WorkspaceAIProvider } from "@prisma/client";

// ============================================================
// Type Converters
// ============================================================

function toWorkspaceAIProvider(provider: PrismaWorkspaceAIProvider, apiKey: string): WorkspaceAIProvider {
  return {
    id: provider.id,
    workspaceId: provider.workspaceId,
    provider: provider.provider as LLMProviderType,
    name: provider.name,
    apiKey,
    baseURL: provider.baseURL,
    models: provider.models,
    isActive: provider.isActive,
    priority: provider.priority,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

function toPublicWorkspaceAIProvider(provider: Omit<PrismaWorkspaceAIProvider, "apiKey">): PublicWorkspaceAIProvider {
  return {
    id: provider.id,
    workspaceId: provider.workspaceId,
    provider: provider.provider as LLMProviderType,
    name: provider.name,
    baseURL: provider.baseURL,
    models: provider.models,
    isActive: provider.isActive,
    priority: provider.priority,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

// ============================================================
// Service
// ============================================================

@Injectable()
export class WorkspaceAIConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  // ============================================================
  // Provider Methods
  // ============================================================

  /**
   * Get all AI providers for a workspace
   * Returns decrypted API keys for admin use
   */
  async getWorkspaceAIProviders(workspaceId: string): Promise<WorkspaceAIProvider[]> {
    const providers = await this.prisma.workspaceAIProvider.findMany({
      where: { workspaceId },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    });

    return Promise.all(providers.map(async (provider) => toWorkspaceAIProvider(provider, await this.encryptionService.decrypt(provider.apiKey))));
  }

  /**
   * Get public AI providers (without sensitive data)
   * Used for frontend dropdowns and UI display
   */
  async getPublicWorkspaceAIProviders(workspaceId: string): Promise<PublicWorkspaceAIProvider[]> {
    const providers = await this.prisma.workspaceAIProvider.findMany({
      where: { workspaceId },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        workspaceId: true,
        provider: true,
        name: true,
        baseURL: true,
        models: true,
        isActive: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return providers.map(toPublicWorkspaceAIProvider);
  }

  /**
   * Get active AI providers sorted by priority
   * Returns decrypted API keys for AI service consumption
   */
  async getActiveProviders(workspaceId: string): Promise<WorkspaceAIProvider[]> {
    const providers = await this.prisma.workspaceAIProvider.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }], // Lower priority = try first
    });

    return Promise.all(providers.map(async (provider) => toWorkspaceAIProvider(provider, await this.encryptionService.decrypt(provider.apiKey))));
  }

  /**
   * Get a single AI provider by ID
   */
  async getWorkspaceAIProviderById(id: string): Promise<WorkspaceAIProvider> {
    const provider = await this.prisma.workspaceAIProvider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`AI provider with ID ${id} not found`);
    }

    return toWorkspaceAIProvider(provider, await this.encryptionService.decrypt(provider.apiKey));
  }

  /**
   * Create a new AI provider for a workspace
   */
  async createAIProvider(dto: CreateWorkspaceAIProviderDto): Promise<WorkspaceAIProvider> {
    const isCustomProvider = dto.provider === "custom";

    // For custom providers, name and baseURL are required
    if (isCustomProvider) {
      if (!dto.name) {
        throw new BadRequestException("Name is required for custom providers");
      }
      if (!dto.baseURL) {
        throw new BadRequestException("Base URL is required for custom providers");
      }
    }

    // Check if provider already exists for this workspace
    // For standard providers: check by (workspaceId, provider)
    // For custom providers: check by (workspaceId, provider, name)
    const existing = await this.prisma.workspaceAIProvider.findFirst({
      where: {
        workspaceId: dto.workspaceId,
        provider: dto.provider,
        name: isCustomProvider ? dto.name : null,
      },
    });

    if (existing) {
      const providerName = isCustomProvider ? dto.name : dto.provider;
      throw new BadRequestException(`Provider ${providerName} already configured for this workspace`);
    }

    // Validate provider type
    if (!PROVIDER_REGISTRY[dto.provider as LLMProviderType]) {
      throw new BadRequestException(`Unknown provider type: ${dto.provider}`);
    }

    // Check if API key is required
    const registry = PROVIDER_REGISTRY[dto.provider as LLMProviderType];
    if (registry.requiresApiKey && !dto.apiKey) {
      throw new BadRequestException(`API key is required for provider ${dto.provider}`);
    }

    // Encrypt API key before storing
    const encryptedApiKey = await this.encryptionService.encrypt(dto.apiKey);

    const provider = await this.prisma.workspaceAIProvider.create({
      data: {
        ...dto,
        name: isCustomProvider ? dto.name : null, // Only store name for custom providers
        apiKey: encryptedApiKey,
      },
    });

    return toWorkspaceAIProvider(provider, dto.apiKey);
  }

  /**
   * Update an existing AI provider
   */
  async updateAIProvider(id: string, dto: UpdateWorkspaceAIProviderDto): Promise<WorkspaceAIProvider> {
    const existing = await this.prisma.workspaceAIProvider.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`AI provider with ID ${id} not found`);
    }

    const updateData: any = { ...dto };
    if (dto.apiKey) {
      updateData.apiKey = await this.encryptionService.encrypt(dto.apiKey);
    }

    const provider = await this.prisma.workspaceAIProvider.update({
      where: { id },
      data: updateData,
    });

    return toWorkspaceAIProvider(provider, await this.encryptionService.decrypt(provider.apiKey));
  }

  /**
   * Update provider priorities (for drag-to-reorder)
   */
  async updateProviderPriorities(workspaceId: string, priorities: Array<{ id: string; priority: number }>): Promise<void> {
    await this.prisma.$transaction(
      priorities.map(({ id, priority }) =>
        this.prisma.workspaceAIProvider.update({
          where: { id },
          data: { priority },
        }),
      ),
    );
  }

  /**
   * Delete an AI provider
   */
  async deleteAIProvider(id: string): Promise<void> {
    try {
      await this.prisma.workspaceAIProvider.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException(`AI provider with ID ${id} not found`);
    }
  }

  // ============================================================
  // Combined/Helper Methods
  // ============================================================

  /**
   * Check if a workspace has any active AI providers
   */
  async hasActiveProviders(workspaceId: string): Promise<boolean> {
    const count = await this.prisma.workspaceAIProvider.count({
      where: {
        workspaceId,
        isActive: true,
      },
    });

    return count > 0;
  }

  /**
   * Get available models for a workspace based on configured providers
   * Returns all unique models from active providers' models strings
   */
  async getAvailableModelsForWorkspace(workspaceId: string): Promise<string[]> {
    const providers = await this.getPublicWorkspaceAIProviders(workspaceId);
    const activeProviders = providers.filter((p) => p.isActive);
    return getAllModelsFromProviders(activeProviders);
  }

  /**
   * Get workspace AI configuration summary for admin dashboard
   */
  async getWorkspaceAIConfigSummary(workspaceId: string): Promise<{
    providers: PublicWorkspaceAIProvider[];
    availableModels: string[];
  }> {
    const providers = await this.getPublicWorkspaceAIProviders(workspaceId);
    const activeProviders = providers.filter((p) => p.isActive);
    const availableModels = getAllModelsFromProviders(activeProviders);

    return {
      providers,
      availableModels,
    };
  }
}
