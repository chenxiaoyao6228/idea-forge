import request from "@/lib/request";
import type { Star } from "@idea/contracts";
import { CreateStarDto, UpdateStarDto, StarResponse, ListStarDto } from "@idea/contracts";

export const starApi = {
  /**
   * Create a new star
   */
  create: async (data: CreateStarDto) => request.post<CreateStarDto, { data: Star; permissions: any[] }>("/api/stars", data),

  /**
   * Get all stars for the current user in a specific workspace
   */
  findAll: async (workspaceId: string) => request.get<ListStarDto, StarResponse>("/api/stars", { params: { workspaceId } }),

  /**
   * Get a specific star by ID
   */
  findOne: async (id: string) => request.get<void, Star>(`/api/stars/${id}`),

  /**
   * Update a star's order
   */
  update: async (id: string, data: UpdateStarDto) => request.patch<UpdateStarDto, { data: Star; permissions: any[] }>(`/api/stars/${id}`, data),

  /**
   *
   * Remove a star
   */
  remove: async (id: string) => request.delete<void, { success: boolean }>(`/api/stars/${id}`),
};
