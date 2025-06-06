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
} from "contracts";

export const groupApi = {
  /**
   * Get group information
   */
  getInfo: async (id: string) => request.get<void, GroupInfoResponse>(`/api/groups/${id}`),

  /**
   * List groups
   */
  list: async (data: GroupListRequestDto) => request.get<GroupListRequestDto, GroupListResponse>("/api/groups", { params: data }),

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
};
