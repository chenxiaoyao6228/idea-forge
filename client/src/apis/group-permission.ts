import request from "@/lib/request";
import type { GroupPermissionResponse, DocGroupPermissionDto, GroupPermissionListRequest, GroupPermissionListResponse } from "contracts";

export const groupPermissionApi = {
  listGroupPermissions: async (query: GroupPermissionListRequest) => request.get<GroupPermissionListResponse>(`/api/group-permissions`, { params: query }),

  addGroupPermission: async (body: DocGroupPermissionDto) => request.post<GroupPermissionResponse>(`/api/group-permissions`, body),

  removeGroupPermission: async (id: string) => request.delete(`/api/group-permissions/${id}`),
};
