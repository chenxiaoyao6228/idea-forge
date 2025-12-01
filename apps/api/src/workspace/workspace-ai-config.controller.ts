import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { WorkspaceAIConfigService } from "./workspace-ai-config.service";
import type { PublicWorkspaceAIProvider, UpdateWorkspaceAIProviderDto, WorkspaceAIProvider, CreateWorkspaceAIProviderBody } from "@idea/contracts";
import { Action } from "@/_shared/casl/ability.class";
import { PolicyGuard } from "@/_shared/casl/policy.guard";
import { CheckPolicy } from "@/_shared/casl/policy.decorator";
import { CreateWorkspaceAIProviderBodySchema, UpdateWorkspaceAIProviderSchema } from "@idea/contracts";
import { ZodValidationPipe } from "@/_shared/pipes/zod-validation.pipe";
import { z } from "zod";

// Schema for updating provider priorities
const UpdateProviderPrioritiesSchema = z.array(
  z.object({
    id: z.string().cuid(),
    priority: z.number().int().min(0),
  }),
);

/**
 * Controller for managing workspace AI provider configurations
 * Only workspace OWNER and ADMIN can access these endpoints
 */
@Controller("api/workspaces/:workspaceId/ai-config")
@UseGuards(PolicyGuard)
export class WorkspaceAIConfigController {
  constructor(private readonly aiConfigService: WorkspaceAIConfigService) {}

  // ============================================================
  // Summary Endpoint
  // ============================================================

  /**
   * Get complete AI configuration summary for a workspace
   * Includes providers (public) and available models
   */
  @Get("summary")
  @CheckPolicy(Action.Read, "Workspace")
  async getWorkspaceAIConfigSummary(@Param("workspaceId") workspaceId: string): Promise<{
    providers: PublicWorkspaceAIProvider[];
    availableModels: string[];
  }> {
    return this.aiConfigService.getWorkspaceAIConfigSummary(workspaceId);
  }

  // ============================================================
  // Provider Endpoints
  // ============================================================

  /**
   * Get all AI providers for a workspace
   * Returns full providers including decrypted API keys (admin only)
   */
  @Get("providers")
  @CheckPolicy(Action.Update, "Workspace")
  async getWorkspaceAIProviders(@Param("workspaceId") workspaceId: string): Promise<WorkspaceAIProvider[]> {
    return this.aiConfigService.getWorkspaceAIProviders(workspaceId);
  }

  /**
   * Get public AI providers (without sensitive data)
   * Used for frontend display
   */
  @Get("providers/public")
  @CheckPolicy(Action.Read, "Workspace")
  async getPublicWorkspaceAIProviders(@Param("workspaceId") workspaceId: string): Promise<PublicWorkspaceAIProvider[]> {
    return this.aiConfigService.getPublicWorkspaceAIProviders(workspaceId);
  }

  /**
   * Get a single AI provider by ID
   */
  @Get("providers/:id")
  @CheckPolicy(Action.Update, "Workspace")
  async getWorkspaceAIProviderById(@Param("id") id: string): Promise<WorkspaceAIProvider> {
    return this.aiConfigService.getWorkspaceAIProviderById(id);
  }

  /**
   * Create a new AI provider
   */
  @Post("providers")
  @CheckPolicy(Action.Update, "Workspace")
  async createAIProvider(
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(CreateWorkspaceAIProviderBodySchema)) dto: CreateWorkspaceAIProviderBody,
  ): Promise<WorkspaceAIProvider> {
    return this.aiConfigService.createAIProvider({ ...dto, workspaceId });
  }

  /**
   * Update an existing AI provider
   */
  @Patch("providers/:id")
  @CheckPolicy(Action.Update, "Workspace")
  async updateAIProvider(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateWorkspaceAIProviderSchema)) dto: UpdateWorkspaceAIProviderDto,
  ): Promise<WorkspaceAIProvider> {
    return this.aiConfigService.updateAIProvider(id, dto);
  }

  /**
   * Update provider priorities (for drag-to-reorder)
   */
  @Put("providers/priorities")
  @CheckPolicy(Action.Update, "Workspace")
  async updateProviderPriorities(
    @Param("workspaceId") workspaceId: string,
    @Body(new ZodValidationPipe(UpdateProviderPrioritiesSchema)) priorities: Array<{ id: string; priority: number }>,
  ): Promise<{ success: boolean }> {
    await this.aiConfigService.updateProviderPriorities(workspaceId, priorities);
    return { success: true };
  }

  /**
   * Delete an AI provider
   */
  @Delete("providers/:id")
  @CheckPolicy(Action.Update, "Workspace")
  async deleteAIProvider(@Param("id") id: string): Promise<{ success: boolean }> {
    await this.aiConfigService.deleteAIProvider(id);
    return { success: true };
  }

  // ============================================================
  // Available Models Endpoint
  // ============================================================

  /**
   * Get available models based on configured providers
   * Returns all unique models from active providers' models strings
   */
  @Get("models/available")
  @CheckPolicy(Action.Read, "Workspace")
  async getAvailableModels(@Param("workspaceId") workspaceId: string): Promise<string[]> {
    return this.aiConfigService.getAvailableModelsForWorkspace(workspaceId);
  }
}
