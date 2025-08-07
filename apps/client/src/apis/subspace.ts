import request from "@/lib/request";
import {
  UpdateSubspaceRequest,
  AddSubspaceMemberRequest,
  UpdateSubspaceMemberRequest,
  SubspaceDetailResponse,
  SubspaceMemberListResponse,
  NavigationNode,
  MoveSubspaceRequest,
  CreateSubspaceRequest,
  SubspaceUserPermission,
  SubspaceGroupPermission,
  SubspaceUserPermissionResponse,
  SubspaceGroupPermissionResponse,
  Subspace,
  BatchSetWorkspaceWideRequest,
  BatchSetWorkspaceWideResponse,
} from "@idea/contracts";

export const subspaceApi = {
  // Subspace operations
  createSubspace: async (data: CreateSubspaceRequest) => request.post<CreateSubspaceRequest, Subspace>("/api/subspaces", data),

  getSubspace: async (id: string) => request.get<void, SubspaceDetailResponse>(`/api/subspaces/${id}`),

  // Fetch all subspaces (including virtual/my-docs) for the user in the workspace
  getUserSubspacesIncludingVirtual: async (workspaceId: string) => request.get<void, Subspace[]>(`/api/subspaces/user/${workspaceId}`),

  updateSubspace: async (id: string, data: UpdateSubspaceRequest) => request.put<UpdateSubspaceRequest, SubspaceDetailResponse>(`/api/subspaces/${id}`, data),

  deleteSubspace: async (id: string) => request.delete<void, { success: boolean }>(`/api/subspaces/${id}`),

  moveSubspace: async (id: string, data: MoveSubspaceRequest) => request.post<MoveSubspaceRequest, { index: string }>(`/api/subspaces/${id}/move`, data),

  // Batch operations
  batchSetWorkspaceWide: async (data: BatchSetWorkspaceWideRequest) =>
    request.post<BatchSetWorkspaceWideRequest, BatchSetWorkspaceWideResponse>("/api/subspaces/batch-set-workspace-wide", data),

  // Subspace member operations
  getSubspaceMembers: async (subspaceId: string) => request.get<void, SubspaceMemberListResponse>(`/api/subspaces/${subspaceId}/members`),

  addSubspaceMember: async (subspaceId: string, data: AddSubspaceMemberRequest) =>
    request.post<AddSubspaceMemberRequest, { member: any }>(`/api/subspaces/${subspaceId}/members`, data),

  updateSubspaceMember: async (subspaceId: string, memberId: string, data: UpdateSubspaceMemberRequest) =>
    request.put<UpdateSubspaceMemberRequest, { member: any }>(`/api/subspaces/${subspaceId}/members/${memberId}`, data),

  removeSubspaceMember: async (subspaceId: string, memberId: string) =>
    request.delete<void, { success: boolean }>(`/api/subspaces/${subspaceId}/members/${memberId}`),

  fetchNavigationTree: async (subspaceId: string) => request.get<void, NavigationNode>(`/api/subspaces/${subspaceId}/navigationTree`),

  // User Permissions
  addUserPermission: async (id: string, data: SubspaceUserPermission) =>
    request.post<SubspaceUserPermission, SubspaceUserPermissionResponse>(`/api/subspaces/${id}/user-permissions`, data),

  removeUserPermission: async (id: string, targetUserId: string) =>
    request.delete<void, { success: boolean }>(`/api/subspaces/${id}/user-permissions/${targetUserId}`),

  listUserPermissions: async (id: string) => request.get<void, SubspaceUserPermissionResponse>(`/api/subspaces/${id}/user-permissions`),

  // Group Permissions
  addGroupPermission: async (id: string, data: SubspaceGroupPermission) =>
    request.post<SubspaceGroupPermission, SubspaceGroupPermissionResponse>(`/api/subspaces/${id}/group-permissions`, data),

  removeGroupPermission: async (id: string, groupId: string) => request.delete<void, { success: boolean }>(`/api/subspaces/${id}/group-permissions/${groupId}`),

  listGroupPermissions: async (id: string) => request.get<void, SubspaceGroupPermissionResponse>(`/api/subspaces/${id}/group-permissions`),
};
