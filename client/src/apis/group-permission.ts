import request from "@/lib/request";
import type { GroupPermissionResponse, DocGroupPermissionDto, GroupPermissionListRequest, GroupPermissionListResponse } from "contracts";

export const groupPermissionApi = {
  listGroupPermissions: async (query: GroupPermissionListRequest) => {
    const { data } = await request.get<GroupPermissionListResponse>(`/api/group-permissions`, { params: query });
    return data;
  },

  addGroupPermission: async (body: DocGroupPermissionDto) => {
    const { data } = await request.post<GroupPermissionResponse>(`/api/group-permissions`, body);
    return data;
  },

  removeGroupPermission: async (id: string) => {
    await request.delete(`/api/group-permissions/${id}`);
  },
};
