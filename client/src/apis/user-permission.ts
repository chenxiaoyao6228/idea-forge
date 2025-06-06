import request from "@/lib/request";
import type { UserPermission, UserPermissionListRequest, UserPermissionListResponse, UserPermissionResponse } from "contracts";

export const userPermissionApi = {
  list: async (userId: string, params: UserPermissionListRequest) => {
    const { data } = await request.get<UserPermissionListResponse>(`/api/users/${userId}/permissions`, { params });
    return data;
  },

  create: async (userId: string, body: UserPermission) => {
    const { data } = await request.post<UserPermissionResponse>(`/api/users/${userId}/permissions`, body);
    return data;
  },

  delete: async (userId: string, id: string) => {
    await request.delete(`/api/users/${userId}/permissions/${id}`);
  },
};
