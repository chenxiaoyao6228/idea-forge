import request from "@/lib/request";

export const permissionApi = {
  getResourcePermissions: async (resourceType: string, resourceId: string) => {
    return request.get<Record<string, boolean>>(`/api/permissions/resources/${resourceType}/${resourceId}`);
  },
  getSharedWithMe: async (query: any) => {
    return request.get(`/api/permissions/shared-with-me`, { params: query });
  },

  addUserPermission: async (data: {
    userId: string;
    resourceType: string;
    resourceId: string;
    permission: string;
  }) => {
    return request.post(`/api/permissions/${data.resourceType}/${data.resourceId}`, {
      userId: data.userId,
      permission: data.permission,
    });
  },

  addGroupPermission: async (data: {
    groupId: string;
    resourceType: string;
    resourceId: string;
    permission: string;
  }) => {
    return request.post(`/api/permissions/${data.resourceType}/${data.resourceId}`, {
      groupId: data.groupId,
      permission: data.permission,
    });
  },
};
