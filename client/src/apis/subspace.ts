import request from "@/lib/request";
import {
  CreateSubspaceRequest,
  UpdateSubspaceRequest,
  AddSubspaceMemberRequest,
  UpdateSubspaceMemberRequest,
  SubspaceListResponse,
  SubspaceDetailResponse,
  SubspaceMemberListResponse,
} from "contracts";

export const subspaceApi = {
  // Subspace operations
  createSubspace: async (data: CreateSubspaceRequest) => request.post<CreateSubspaceRequest, SubspaceDetailResponse>("/api/subspaces", data),

  getSubspace: async (id: string) => request.get<void, SubspaceDetailResponse>(`/api/subspaces/${id}`),

  updateSubspace: async (id: string, data: UpdateSubspaceRequest) => request.put<UpdateSubspaceRequest, SubspaceDetailResponse>(`/api/subspaces/${id}`, data),

  deleteSubspace: async (id: string) => request.delete<void, { success: boolean }>(`/api/subspaces/${id}`),

  // Subspace member operations
  getSubspaceMembers: async (subspaceId: string) => request.get<void, SubspaceMemberListResponse>(`/api/subspaces/${subspaceId}/members`),

  addSubspaceMember: async (subspaceId: string, data: AddSubspaceMemberRequest) =>
    request.post<AddSubspaceMemberRequest, { member: any }>(`/api/subspaces/${subspaceId}/members`, data),

  updateSubspaceMember: async (subspaceId: string, memberId: string, data: UpdateSubspaceMemberRequest) =>
    request.put<UpdateSubspaceMemberRequest, { member: any }>(`/api/subspaces/${subspaceId}/members/${memberId}`, data),

  removeSubspaceMember: async (subspaceId: string, memberId: string) =>
    request.delete<void, { success: boolean }>(`/api/subspaces/${subspaceId}/members/${memberId}`),
};
