import request from "@/lib/request";
import type {
  GroupListRequestDto,
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupUserDto,
  GroupInfoResponse,
  GroupListResponse,
  GroupCreateResponse,
  GroupUpdateResponse,
  GroupDeleteResponse,
  GroupAddUserResponse,
  GroupRemoveUserResponse,
  DocGroupPermissionDto,
  DocGroupPermissionResponse,
} from "contracts";

export const groupApi = {
  /**
   * Get group information
   */
  getInfo: async (id: string) => request.get<void, GroupInfoResponse>(`/api/groups/${id}`),

  /**
   * List groups
   */
  list: async (params: { limit?: number; page?: number; sortBy?: string; sortOrder?: string; query?: string }) =>
    request.get<typeof params, GroupListResponse>("/api/groups", { params }),

  /**
   * Create a new group
   */
  create: async (data: CreateGroupDto) => request.post<CreateGroupDto, GroupCreateResponse>("/api/groups", data),

  /**
   * Update an existing group
   */
  update: async (id: string, data: UpdateGroupDto) => request.patch<UpdateGroupDto, GroupUpdateResponse>(`/api/groups/${id}`, data),

  /**
   * Delete a group
   */
  delete: async (id: string) => request.delete<void, GroupDeleteResponse>(`/api/groups/${id}`),

  /**
   * Add a user to a group
   */
  addUser: async (id: string, data: AddGroupUserDto) => request.post<AddGroupUserDto, GroupAddUserResponse>(`/api/groups/${id}/users`, data),

  /**
   * Remove a user from a group
   */
  removeUser: async (id: string, userId: number) => request.delete<void, GroupRemoveUserResponse>(`/api/groups/${id}/users/${userId}`),

  // Group Permissions APIs
  addGroupPermission: async (id: string, data: DocGroupPermissionDto) =>
    request.post<DocGroupPermissionDto, DocGroupPermissionResponse>(`/api/groups/${id}/group-permissions`, data),

  removeGroupPermission: async (id: string, groupId: string) => request.delete<void, { success: boolean }>(`/api/groups/${id}/group-permissions/${groupId}`),

  listGroupPermissions: async (id: string) => request.get<void, DocGroupPermissionResponse[]>(`/api/groups/${id}/group-permissions`),
};
