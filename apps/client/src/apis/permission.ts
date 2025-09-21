import request from "@/lib/request";
import { PermissionLevel } from "@idea/contracts";

export interface EnhancedPermissionResponse {
  permissionLevel: PermissionLevel;
  source: "DIRECT" | "GROUP" | "SUBSPACE" | "WORKSPACE" | "GUEST" | "PARENT";
  inheritedFrom?: string;
  effectivePermissions: Record<string, boolean>;
  subspaceContext?: {
    subspaceId: string;
    userRole: "ADMIN" | "MEMBER" | null;
    subspaceAdminPermission: PermissionLevel;
    subspaceMemberPermission: PermissionLevel;
    nonSubspaceMemberPermission: PermissionLevel;
  };
  workspaceContext?: {
    workspaceId: string;
    userRole: "OWNER" | "ADMIN" | "MEMBER";
  };
  parentContext?: {
    parentDocumentId: string;
    inheritedPermission: PermissionLevel;
  };
  expiresAt?: string;
}

export interface BatchPermissionResponse {
  permissions: Record<string, PermissionLevel>;
  contexts: Record<string, Omit<EnhancedPermissionResponse, "permissionLevel">>;
}

export const permissionApi = {
  getResourcePermissions: async (resourceType: string, resourceId: string) => {
    return request.get<Record<string, boolean>>(`/api/permissions/resources/${resourceType}/${resourceId}`);
  },

  /**
   * Get enhanced document permission with inheritance and context
   */
  getEnhancedDocumentPermission: async (
    documentId: string,
    options: {
      includeInheritance?: boolean;
      includeContext?: boolean;
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (options.includeInheritance) params.set("includeInheritance", "true");
    if (options.includeContext) params.set("includeContext", "true");

    return request.get<EnhancedPermissionResponse>(`/api/permissions/documents/${documentId}/enhanced?${params.toString()}`);
  },

  /**
   * Get batch document permissions with inheritance and context
   */
  getBatchDocumentPermissions: async (
    documentIds: string[],
    options: {
      includeInheritance?: boolean;
      includeContext?: boolean;
    } = {},
  ) => {
    return request.post<BatchPermissionResponse>("/api/permissions/documents/batch", {
      documentIds,
      includeInheritance: options.includeInheritance,
      includeContext: options.includeContext,
    });
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
