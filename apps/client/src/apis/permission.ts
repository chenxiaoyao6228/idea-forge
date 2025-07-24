import request from "@/lib/request";

export const permissionApi = {
  getResourcePermissions: async (resourceType: string, resourceId: string) => {
    return request.get<Record<string, boolean>>(`/api/permissions/resources/${resourceType}/${resourceId}`);
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

  getUserPermissions: async (data: {
    resourceType: string;
    resourceId: string;
    page: number;
    limit: number;
  }) => {
    return request.get(`/api/permissions/users`, { params: data });
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

  getGroupPermissions: async (data: {
    resourceType: string;
    resourceId: string;
  }) => {
    return request.get(`/api/permissions/groups`, { params: data });
  },
};
