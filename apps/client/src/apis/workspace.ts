import request from "@/lib/request";
import {
  UpdateWorkspaceRequest,
  WorkspaceDetailResponse,
  WorkspaceListResponse,
  WorkspaceMemberListResponse,
  AddWorkspaceMemberRequest,
  UpdateWorkspaceMemberRequest,
  CreateWorkspaceRequest,
  Workspace,
  BatchAddWorkspaceMemberRequest,
  BatchAddWorkspaceMemberResponse,
  WorkspacePublicInviteLink,
  WorkspacePublicInvitationStatus,
  AcceptWorkspaceInvitationResponse,
  InvitationExpirationDuration,
  ResetPublicInviteLinkRequest,
} from "@idea/contracts";
import type { WorkspaceAIProvider, PublicWorkspaceAIProvider, CreateWorkspaceAIProviderDto, UpdateWorkspaceAIProviderDto } from "@idea/contracts";

// Response type for AI config summary
interface AIConfigSummary {
  providers: PublicWorkspaceAIProvider[];
  availableModels: string[];
}

export const workspaceApi = {
  // Workspace operations
  createWorkspace: async (data: CreateWorkspaceRequest) => request.post<CreateWorkspaceRequest, Workspace>("/api/workspaces", data),

  getWorkspace: async (id: string) => request.get<void, Workspace>(`/api/workspaces/${id}`),

  getWorkspaces: async () => request.get<void, WorkspaceListResponse>("/api/workspaces"),

  updateWorkspace: async (id: string, data: UpdateWorkspaceRequest) =>
    request.patch<UpdateWorkspaceRequest, WorkspaceDetailResponse>(`/api/workspaces/${id}`, data),

  deleteWorkspace: async (id: string) => request.delete<void, { success: boolean }>(`/api/workspaces/${id}`),

  reorderWorkspaces: async (workspaceIds: string[]) =>
    request.post<{ workspaceIds: string[] }, { success: boolean }>("/api/workspaces/reorder", { workspaceIds }),

  // Workspace member operations
  getWorkspaceMembers: async (workspaceId: string) => request.get<void, WorkspaceMemberListResponse>(`/api/workspaces/${workspaceId}/members`),

  addWorkspaceMember: async (workspaceId: string, data: AddWorkspaceMemberRequest) =>
    request.post<AddWorkspaceMemberRequest, { member: any }>(`/api/workspaces/${workspaceId}/members`, data),

  batchAddWorkspaceMembers: async (workspaceId: string, data: BatchAddWorkspaceMemberRequest) =>
    request.post<BatchAddWorkspaceMemberRequest, BatchAddWorkspaceMemberResponse>(`/api/workspaces/${workspaceId}/members/batch`, data),

  updateWorkspaceMember: async (workspaceId: string, memberId: string, data: UpdateWorkspaceMemberRequest) =>
    request.patch<UpdateWorkspaceMemberRequest, { member: any }>(`/api/workspaces/${workspaceId}/members/${memberId}/role`, data),

  removeWorkspaceMember: async (workspaceId: string, memberId: string) =>
    request.delete<void, { success: boolean }>(`/api/workspaces/${workspaceId}/members/${memberId}`),

  getPublicInviteLink: async (workspaceId: string) => request.get<void, WorkspacePublicInviteLink>(`/api/workspaces/${workspaceId}/invite/public`),

  resetPublicInviteLink: async (workspaceId: string, duration?: InvitationExpirationDuration) =>
    request.post<ResetPublicInviteLinkRequest, WorkspacePublicInviteLink>(`/api/workspaces/${workspaceId}/invite/public/reset`, { duration }),

  getPublicInvitationStatus: async (token: string) => request.get<void, WorkspacePublicInvitationStatus>(`/api/public-invitations/${token}`),

  acceptPublicInvitation: async (token: string) => request.post<void, AcceptWorkspaceInvitationResponse>(`/api/public-invitations/${token}/accept`, {}),

  // Workspace switching
  switchWorkspace: async (workspaceId: string) =>
    request.patch<{ workspaceId: string }, { success: boolean; currentWorkspaceId: string; isFirstGuestVisit?: boolean }>("/api/workspaces/switch", {
      workspaceId,
    }),

  // Leave workspace
  leaveWorkspace: async (workspaceId: string) => request.delete<void, { success: boolean }>(`/api/workspaces/${workspaceId}/leave`),

  getCurrentWorkspace: async () => request.get<void, Workspace>("/api/workspaces/current"),

  // ==============================================================
  // AI Configuration - Summary
  // ==============================================================

  getAIConfigSummary: async (workspaceId: string) => request.get<void, AIConfigSummary>(`/api/workspaces/${workspaceId}/ai-config/summary`),

  // ==============================================================
  // AI Configuration - Providers
  // ==============================================================

  getAIProviders: async (workspaceId: string) => request.get<void, WorkspaceAIProvider[]>(`/api/workspaces/${workspaceId}/ai-config/providers`),

  getPublicAIProviders: async (workspaceId: string) =>
    request.get<void, PublicWorkspaceAIProvider[]>(`/api/workspaces/${workspaceId}/ai-config/providers/public`),

  getAIProviderById: async (workspaceId: string, providerId: string) =>
    request.get<void, WorkspaceAIProvider>(`/api/workspaces/${workspaceId}/ai-config/providers/${providerId}`),

  createAIProvider: async (workspaceId: string, data: Omit<CreateWorkspaceAIProviderDto, "workspaceId">) =>
    request.post<Omit<CreateWorkspaceAIProviderDto, "workspaceId">, WorkspaceAIProvider>(`/api/workspaces/${workspaceId}/ai-config/providers`, data),

  updateAIProvider: async (workspaceId: string, providerId: string, data: UpdateWorkspaceAIProviderDto) =>
    request.patch<UpdateWorkspaceAIProviderDto, WorkspaceAIProvider>(`/api/workspaces/${workspaceId}/ai-config/providers/${providerId}`, data),

  updateAIProviderPriorities: async (workspaceId: string, priorities: Array<{ id: string; priority: number }>) =>
    request.put<Array<{ id: string; priority: number }>, { success: boolean }>(`/api/workspaces/${workspaceId}/ai-config/providers/priorities`, priorities),

  deleteAIProvider: async (workspaceId: string, providerId: string) =>
    request.delete<void, { success: boolean }>(`/api/workspaces/${workspaceId}/ai-config/providers/${providerId}`),

  // ==============================================================
  // AI Configuration - Available Models
  // ==============================================================

  getAvailableAIModels: async (workspaceId: string) => request.get<void, string[]>(`/api/workspaces/${workspaceId}/ai-config/models/available`),
};
