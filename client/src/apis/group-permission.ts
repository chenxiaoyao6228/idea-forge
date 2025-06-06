import request from "@/lib/request";
import type { GroupPermission, GroupPermissionListRequest, GroupPermissionListResponse, GroupPermissionResponse } from "contracts";

export const groupPermissionApi = {
  list: async (groupId: string, params: GroupPermissionListRequest) => {
    const { data } = await request.get<GroupPermissionListResponse>(`/api/groups/${groupId}/permissions`, { params });
    return data;
  },

  create: async (groupId: string, body: GroupPermission) => {
    const { data } = await request.post<GroupPermissionResponse>(`/api/groups/${groupId}/permissions`, body);
    return data;
  },

  delete: async (groupId: string, id: string) => {
    await request.delete(`/api/groups/${groupId}/permissions/${id}`);
  },
};
