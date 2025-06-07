import request from "@/lib/request";
import type { User, UpdateUserRequest, UserListRequestDto, UserListResponse } from "contracts";

export interface UserResponse {
  data: User;
}

export const userApi = {
  /**
   * Get user information by ID
   * @param id - User ID
   * @returns User information
   */
  getById: async (id: string) => {
    const { data } = await request.get<void, UserResponse>(`/api/user/${id}`);
    return data;
  },

  /**
   * Update user information
   * @param id - User ID
   * @param body - Updated user data
   * @returns Updated user information
   */
  update: async (id: string, body: UpdateUserRequest) => {
    const { data } = await request.put<UpdateUserRequest, UserResponse>(`/api/user/${id}`, body);
    return data;
  },

  /**
   * Search users with pagination and filtering
   * @param params - Search parameters including query, pagination, and sorting
   * @returns Paginated list of users
   */
  search: async (params: UserListRequestDto) => {
    const { data } = await request.get<UserListRequestDto, UserListResponse>("/api/user/search", { params });
    return data;
  },
};
