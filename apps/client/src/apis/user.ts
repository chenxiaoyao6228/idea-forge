import request from "@/lib/request";
import type { User, UpdateUserRequest, UserListRequestDto, UserListResponse } from "@idea/contracts";

export interface UserResponse {
  data: User;
}

export const userApi = {
  /**
   * Get user information by ID
   * @param id - User ID
   * @returns User information
   */
  getById: async (id: string) => request.get<void, UserResponse>(`/api/users/${id}`),

  /**
   * Update user information
   * @param id - User ID
   * @param body - Updated user data
   * @returns Updated user information
   */
  update: async (id: string, body: UpdateUserRequest) => request.put<UpdateUserRequest, UserResponse>(`/api/users/${id}`, body),

  /**
   * Search users with pagination and filtering
   * @param params - Search parameters including query, pagination, and sorting
   * @returns Paginated list of users
   */
  search: async (params: UserListRequestDto) => request.get<UserListRequestDto, UserListResponse>("/api/users", { params }),
};
