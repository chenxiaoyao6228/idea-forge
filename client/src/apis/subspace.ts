import request from "@/lib/request";
import {
  UpdateSubspaceRequest,
  AddSubspaceMemberRequest,
  UpdateSubspaceMemberRequest,
  SubspaceDetailResponse,
  SubspaceMemberListResponse,
  NavigationNode,
  MoveSubspaceRequest,
} from "contracts";

import { Subspace, SubspaceOptionalDefaults } from "contracts";

export const subspaceApi = {
  // Subspace operations
  createSubspace: async (data: SubspaceOptionalDefaults) => request.post<SubspaceOptionalDefaults, Subspace>("/api/subspaces", data),

  getSubspace: async (id: string) => request.get<void, SubspaceDetailResponse>(`/api/subspaces/${id}`),

  getSubspaces: async () => request.get<any, Subspace[]>("/api/subspaces/list"),

  updateSubspace: async (id: string, data: UpdateSubspaceRequest) => request.put<UpdateSubspaceRequest, SubspaceDetailResponse>(`/api/subspaces/${id}`, data),

  deleteSubspace: async (id: string) => request.delete<void, { success: boolean }>(`/api/subspaces/${id}`),

  moveSubspace: async (id: string, data: MoveSubspaceRequest) => request.post<MoveSubspaceRequest, { index: string }>(`/api/subspaces/${id}/move`, data),

  // Subspace member operations
  getSubspaceMembers: async (subspaceId: string) => request.get<void, SubspaceMemberListResponse>(`/api/subspaces/${subspaceId}/members`),

  addSubspaceMember: async (subspaceId: string, data: AddSubspaceMemberRequest) =>
    request.post<AddSubspaceMemberRequest, { member: any }>(`/api/subspaces/${subspaceId}/members`, data),

  updateSubspaceMember: async (subspaceId: string, memberId: string, data: UpdateSubspaceMemberRequest) =>
    request.put<UpdateSubspaceMemberRequest, { member: any }>(`/api/subspaces/${subspaceId}/members/${memberId}`, data),

  removeSubspaceMember: async (subspaceId: string, memberId: string) =>
    request.delete<void, { success: boolean }>(`/api/subspaces/${subspaceId}/members/${memberId}`),

  fetchNavigationTree: async (subspaceId: string) => request.get<void, NavigationNode>(`/api/subspaces/${subspaceId}/navigationTree`),
};
