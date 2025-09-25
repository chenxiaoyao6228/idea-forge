import request from "@/lib/request";
import { PermissionLevel } from "@idea/contracts";

export const permissionApi = {
  getResourcePermissions: async (resourceType: string, documentId: string) => {
    return request.get<Record<string, boolean>>(`/api/permissions/resources/${resourceType}/${documentId}`);
  },

  addUserPermission: async (data: {
    userId: string;
    resourceType: string;
    documentId: string;
    permission: string;
  }) => {
    return request.post(`/api/permissions/${data.resourceType}/${data.documentId}`, {
      userId: data.userId,
      permission: data.permission,
    });
  },

  getUserPermissions: async (data: {
    resourceType: string;
    documentId: string;
    page: number;
    limit: number;
  }) => {
    return request.get(`/api/permissions/users`, { params: data });
  },

  addGroupPermission: async (data: {
    groupId: string;
    resourceType: string;
    documentId: string;
    permission: string;
  }) => {
    return request.post(`/api/permissions/${data.resourceType}/${data.documentId}`, {
      groupId: data.groupId,
      permission: data.permission,
    });
  },

  getGroupPermissions: async (data: {
    resourceType: string;
    documentId: string;
  }) => {
    return request.get(`/api/permissions/groups`, { params: data });
  },
};
