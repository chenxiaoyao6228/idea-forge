import request from "@/lib/request";
import {
  UpdateWorkspaceRequest,
  WorkspaceDetailResponse,
  WorkspaceListResponse,
  WorkspaceMemberListResponse,
  AddWorkspaceMemberRequest,
  UpdateWorkspaceMemberRequest,
} from "contracts";

import { WorkspaceOptionalDefaults, Workspace } from "contracts";

export const workspaceApi = {
  // Workspace operations
  createWorkspace: async (data: WorkspaceOptionalDefaults) => request.post<WorkspaceOptionalDefaults, Workspace>("/api/workspaces", data),

  getWorkspace: async (id: string) => request.get<void, Workspace>(`/api/workspaces/${id}`),

  getWorkspaces: async () => request.get<void, WorkspaceListResponse>("/api/workspaces"),

  switchWorkspace: async (id: string) => request.post<{ workspaceId: string }, { success: boolean }>(`/api/workspaces/switch`, { workspaceId: id }),

  updateWorkspace: async (id: string, data: UpdateWorkspaceRequest) =>
    request.put<UpdateWorkspaceRequest, WorkspaceDetailResponse>(`/api/workspaces/${id}`, data),

  deleteWorkspace: async (id: string) => request.delete<void, { success: boolean }>(`/api/workspaces/${id}`),

  // Workspace member operations
  getWorkspaceMembers: async (workspaceId: string) => request.get<void, WorkspaceMemberListResponse>(`/api/workspaces/${workspaceId}/members`),

  addWorkspaceMember: async (workspaceId: string, data: AddWorkspaceMemberRequest) =>
    request.post<AddWorkspaceMemberRequest, { member: any }>(`/api/workspaces/${workspaceId}/members`, data),

  updateWorkspaceMember: async (workspaceId: string, memberId: string, data: UpdateWorkspaceMemberRequest) =>
    request.put<UpdateWorkspaceMemberRequest, { member: any }>(`/api/workspaces/${workspaceId}/members/${memberId}`, data),

  removeWorkspaceMember: async (workspaceId: string, memberId: string) =>
    request.delete<void, { success: boolean }>(`/api/workspaces/${workspaceId}/members/${memberId}`),
};
