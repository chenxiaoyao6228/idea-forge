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
} from "@idea/contracts";

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

  resetPublicInviteLink: async (workspaceId: string) => request.post<void, WorkspacePublicInviteLink>(`/api/workspaces/${workspaceId}/invite/public/reset`, {}),

  getPublicInvitationStatus: async (token: string) => request.get<void, WorkspacePublicInvitationStatus>(`/api/public-invitations/${token}`),

  acceptPublicInvitation: async (token: string) => request.post<void, AcceptWorkspaceInvitationResponse>(`/api/public-invitations/${token}/accept`, {}),

  // Workspace switching
  switchWorkspace: async (workspaceId: string) =>
    request.patch<{ workspaceId: string }, { success: boolean; currentWorkspaceId: string }>("/api/workspaces/switch", { workspaceId }),

  // Leave workspace
  leaveWorkspace: async (workspaceId: string) => request.delete<void, { success: boolean }>(`/api/workspaces/${workspaceId}/leave`),

  getCurrentWorkspace: async () => request.get<void, Workspace>("/api/workspaces/current"),
};
