import request from "@/lib/request";
import type { UserPermission, UserPermissionListRequest, UserPermissionListResponse, UserPermissionResponse } from "contracts";

export const userPermissionApi = {
  list: async (params: UserPermissionListRequest) => {
    return await request.get<UserPermissionListResponse>(`/api/user-permissions`, { params });
  },

  create: async (body: UserPermission) => {
    const { data } = await request.post<UserPermissionResponse>(`/api/user-permissions`, body);
    return data;
  },

  delete: async (id: string) => {
    await request.delete(`/api/user-permissions/${id}`);
  },
};
