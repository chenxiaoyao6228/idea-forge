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
} from "@idea/contracts";

export const workspaceApi = {
  // Workspace operations
  createWorkspace: async (data: CreateWorkspaceRequest) => request.post<CreateWorkspaceRequest, Workspace>("/api/workspaces", data),

  getWorkspace: async (id: string) => request.get<void, Workspace>(`/api/workspaces/${id}`),

  getWorkspaces: async () => request.get<void, WorkspaceListResponse>("/api/workspaces"),

  updateWorkspace: async (id: string, data: UpdateWorkspaceRequest) =>
    request.put<UpdateWorkspaceRequest, WorkspaceDetailResponse>(`/api/workspaces/${id}`, data),

  deleteWorkspace: async (id: string) => request.delete<void, { success: boolean }>(`/api/workspaces/${id}`),

  reorderWorkspaces: async (workspaceIds: string[]) =>
    request.post<{ workspaceIds: string[] }, { success: boolean }>("/api/workspaces/reorder", { workspaceIds }),

  // Workspace member operations
  getWorkspaceMembers: async (workspaceId: string) => request.get<void, WorkspaceMemberListResponse>(`/api/workspaces/${workspaceId}/members`),

  addWorkspaceMember: async (workspaceId: string, data: AddWorkspaceMemberRequest) =>
    request.post<AddWorkspaceMemberRequest, { member: any }>(`/api/workspaces/${workspaceId}/members`, data),

  updateWorkspaceMember: async (workspaceId: string, memberId: string, data: UpdateWorkspaceMemberRequest) =>
    request.patch<UpdateWorkspaceMemberRequest, { member: any }>(`/api/workspaces/${workspaceId}/members/${memberId}/role`, data),

  removeWorkspaceMember: async (workspaceId: string, memberId: string) =>
    request.delete<void, { success: boolean }>(`/api/workspaces/${workspaceId}/members/${memberId}`),
};
