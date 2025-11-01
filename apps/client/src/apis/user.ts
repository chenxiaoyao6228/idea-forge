import request from "@/lib/request";
import type { UpdateUserRequest, UserListRequestDto, UserListResponse, SuggestMentionUsersRequest, SuggestMentionUsersResponse } from "@idea/contracts";
import type { User } from "@idea/contracts";

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
  update: async (id: string, body: UpdateUserRequest) => request.patch<UpdateUserRequest, UserResponse>(`/api/users/${id}`, body),

  /**
   * Search users with pagination and filtering
   * @param params - Search parameters including query, pagination, and sorting
   * @returns Paginated list of users
   */
  search: async (params: UserListRequestDto) => request.get<UserListRequestDto, UserListResponse>("/api/users", { params }),

  /**
   * Regenerate user avatar with a new seed
   * @param id - User ID
   * @param seed - Optional seed for avatar generation (defaults to user's email)
   * @returns Updated user information with new avatar
   */
  regenerateAvatar: async (id: string, seed?: string) => request.post<{ seed?: string }, UserResponse>(`/api/users/${id}/regenerate-avatar`, { seed }),

  /**
   * Suggest users for mention autocomplete
   * @param body - Request with documentId and optional query string
   * @returns List of users matching the query within the document's workspace
   */
  suggestMentionUsers: async (body: SuggestMentionUsersRequest) =>
    request.post<SuggestMentionUsersRequest, SuggestMentionUsersResponse>("/api/users/suggest-mentions", body),

  /**
   * Get last visited document for a workspace
   * @param workspaceId - Workspace ID
   * @returns Last visited document info or null
   */
  getLastVisitedDoc: async (workspaceId: string) =>
    request.get<void, { documentId: string; visitedAt: string } | null>(`/api/users/last-visited-doc/${workspaceId}`),

  /**
   * Update last visited document for a workspace
   * @param body - Workspace ID and document ID
   * @returns Success response
   */
  updateLastVisitedDoc: async (body: { workspaceId: string; documentId: string }) =>
    request.post<{ workspaceId: string; documentId: string }, { success: boolean }>("/api/users/last-visited-doc", body),
};
