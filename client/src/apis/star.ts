import request from "@/lib/request";
import { Star, CreateStarDto, UpdateStarDto, StarResponse, ListStarResponse } from "contracts";

export const starApi = {
  /**
   * Create a new star
   */
  create: async (data: CreateStarDto) => request.post<CreateStarDto, { data: Star; permissions: any[] }>("/api/stars", data),

  /**
   * Get all stars for the current user
   */
  findAll: async () => request.get<void, StarResponse>("/api/stars"),

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
