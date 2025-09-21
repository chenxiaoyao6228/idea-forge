import { create } from "zustand";
import { permissionApi } from "@/apis/permission";
import useRequest from "@ahooksjs/use-request";
import { toast } from "sonner";
import { PermissionLevel } from "@idea/contracts";

// Enhanced permission context interfaces
export interface PermissionContext {
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
}

export interface DocumentPermissionData {
  documentId: string;
  permissionLevel: PermissionLevel;
  source: PermissionContext["source"];
  inheritedFrom?: string;
  effectivePermissions: Record<string, boolean>;
  subspaceContext?: PermissionContext["subspaceContext"];
  workspaceContext?: PermissionContext["workspaceContext"];
  parentContext?: PermissionContext["parentContext"];
  lastUpdated: string;
  expiresAt?: string;
}

export interface BatchPermissionData {
  permissions: Record<string, PermissionLevel>;
  contexts: Record<string, PermissionContext>;
  lastUpdated: string;
}

// Permission cache store
const usePermissionStore = create<{
  documentPermissions: Record<string, DocumentPermissionData>;
  batchPermissions: Record<string, BatchPermissionData>; // keyed by batch hash
  permissionInvalidations: Set<string>; // documents to refresh
}>((set, get) => ({
  documentPermissions: {},
  batchPermissions: {},
  permissionInvalidations: new Set(),
}));

// Helper function to generate batch hash
const generateBatchHash = (documentIds: string[], includeInheritance: boolean): string => {
  const sortedIds = [...documentIds].sort();
  return `${sortedIds.join(",")}:${includeInheritance}`;
};

// Helper function to check if permission is expired
const isPermissionExpired = (data: DocumentPermissionData): boolean => {
  if (!data.expiresAt) return false;
  return new Date() > new Date(data.expiresAt);
};

// Helper function to check if permission needs refresh (5 minutes cache)
const needsRefresh = (lastUpdated: string): boolean => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return new Date(lastUpdated) < fiveMinutesAgo;
};

/**
 * Fetch enhanced document permission with inheritance and context
 */
export const useFetchDocumentPermission = () => {
  return useRequest(
    async (params: { documentId?: string; documentIds?: string[]; includeInheritance?: boolean }) => {
      const { documentId, documentIds, includeInheritance = true } = params;

      try {
        if (documentId) {
          // Single document permission fetch
          const response = await permissionApi.getEnhancedDocumentPermission(documentId, {
            includeInheritance,
            includeContext: true,
          });

          const permissionData: DocumentPermissionData = {
            documentId,
            permissionLevel: response.data.permissionLevel,
            source: response.data.source,
            inheritedFrom: response.data.inheritedFrom,
            effectivePermissions: response.data.effectivePermissions,
            subspaceContext: response.data.subspaceContext,
            workspaceContext: response.data.workspaceContext,
            parentContext: response.data.parentContext,
            lastUpdated: new Date().toISOString(),
            expiresAt: response.data.expiresAt,
          };

          // Update store
          usePermissionStore.setState((state) => ({
            documentPermissions: {
              ...state.documentPermissions,
              [documentId]: permissionData,
            },
            permissionInvalidations: new Set([...state.permissionInvalidations].filter((id) => id !== documentId)),
          }));

          return permissionData;
        }

        if (documentIds && documentIds.length > 0) {
          // Batch document permissions fetch
          const response = await permissionApi.getBatchDocumentPermissions(documentIds, {
            includeInheritance,
            includeContext: true,
          });

          const batchData: BatchPermissionData = {
            permissions: response.data.permissions,
            contexts: response.data.contexts,
            lastUpdated: new Date().toISOString(),
          };

          const batchHash = generateBatchHash(documentIds, includeInheritance);

          // Update store
          usePermissionStore.setState((state) => ({
            batchPermissions: {
              ...state.batchPermissions,
              [batchHash]: batchData,
            },
            permissionInvalidations: new Set([...state.permissionInvalidations].filter((id) => !documentIds.includes(id))),
          }));

          return batchData;
        }

        throw new Error("Either documentId or documentIds must be provided");
      } catch (error) {
        console.error("Failed to fetch document permission:", error);
        toast.error("Failed to fetch permissions", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    },
    { manual: true },
  );
};

/**
 * Get cached document permission data
 */
export const useGetDocumentPermission = () => {
  const documentPermissions = usePermissionStore((state) => state.documentPermissions);
  const permissionInvalidations = usePermissionStore((state) => state.permissionInvalidations);

  return (documentId: string): DocumentPermissionData | null => {
    const cached = documentPermissions[documentId];

    if (!cached) return null;

    // Check if permission is invalidated or expired
    if (permissionInvalidations.has(documentId) || isPermissionExpired(cached) || needsRefresh(cached.lastUpdated)) {
      return null;
    }

    return cached;
  };
};

/**
 * Get cached batch permission data
 */
export const useGetBatchPermissions = () => {
  const batchPermissions = usePermissionStore((state) => state.batchPermissions);

  return (documentIds: string[], includeInheritance: boolean): BatchPermissionData | null => {
    const batchHash = generateBatchHash(documentIds, includeInheritance);
    const cached = batchPermissions[batchHash];

    if (!cached || needsRefresh(cached.lastUpdated)) {
      return null;
    }

    return cached;
  };
};

/**
 * Invalidate specific document permissions
 */
export const useInvalidatePermissions = () => {
  return useRequest(
    async (documentIds: string[]) => {
      try {
        usePermissionStore.setState((state) => ({
          permissionInvalidations: new Set([...state.permissionInvalidations, ...documentIds]),
        }));

        // Also clear cached data
        usePermissionStore.setState((state) => {
          const newDocumentPermissions = { ...state.documentPermissions };
          const newBatchPermissions = { ...state.batchPermissions };

          // Remove individual document permissions
          documentIds.forEach((id) => {
            delete newDocumentPermissions[id];
          });

          // Remove batch permissions that include any of the invalidated documents
          Object.keys(newBatchPermissions).forEach((batchHash) => {
            const ids = batchHash.split(":")[0].split(",");
            if (ids.some((id) => documentIds.includes(id))) {
              delete newBatchPermissions[batchHash];
            }
          });

          return {
            documentPermissions: newDocumentPermissions,
            batchPermissions: newBatchPermissions,
          };
        });

        return documentIds;
      } catch (error) {
        console.error("Failed to invalidate permissions:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

/**
 * Clear all cached permissions
 */
export const useClearPermissionCache = () => {
  return useRequest(
    async () => {
      try {
        usePermissionStore.setState({
          documentPermissions: {},
          batchPermissions: {},
          permissionInvalidations: new Set(),
        });
        return true;
      } catch (error) {
        console.error("Failed to clear permission cache:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

/**
 * Update permission in cache (for optimistic updates)
 */
export const useUpdatePermissionCache = () => {
  return useRequest(
    async (params: {
      documentId: string;
      permissionLevel: PermissionLevel;
      source?: PermissionContext["source"];
      context?: Partial<PermissionContext>;
    }) => {
      try {
        const { documentId, permissionLevel, source = "DIRECT", context = {} } = params;

        usePermissionStore.setState((state) => {
          const existing = state.documentPermissions[documentId];
          const updatedPermission: DocumentPermissionData = {
            documentId,
            permissionLevel,
            source,
            inheritedFrom: context.inheritedFrom,
            effectivePermissions: context.effectivePermissions || {},
            subspaceContext: context.subspaceContext,
            workspaceContext: context.workspaceContext,
            parentContext: context.parentContext,
            lastUpdated: new Date().toISOString(),
            expiresAt: existing?.expiresAt, // Preserve expiration
          };

          return {
            documentPermissions: {
              ...state.documentPermissions,
              [documentId]: updatedPermission,
            },
            permissionInvalidations: new Set([...state.permissionInvalidations].filter((id) => id !== documentId)),
          };
        });

        return params;
      } catch (error) {
        console.error("Failed to update permission cache:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

/**
 * Handle permission change events from WebSocket
 */
export const useHandlePermissionUpdate = () => {
  const { run: updateCache } = useUpdatePermissionCache();
  const { run: invalidatePermissions } = useInvalidatePermissions();

  return useRequest(
    async (event: {
      type: "PERMISSION_CHANGED" | "ACCESS_REVOKED" | "DOCUMENT_SHARED" | "SUBSPACE_PERMISSION_UPDATED";
      resourceId: string;
      resourceType: "DOCUMENT" | "SUBSPACE" | "WORKSPACE";
      userId: string;
      newPermission?: PermissionLevel;
      affectedDocuments?: string[];
    }) => {
      try {
        const { type, resourceId, resourceType, newPermission, affectedDocuments } = event;

        switch (type) {
          case "PERMISSION_CHANGED":
          case "DOCUMENT_SHARED":
            if (resourceType === "DOCUMENT" && newPermission) {
              await updateCache({
                documentId: resourceId,
                permissionLevel: newPermission,
                source: "DIRECT",
              });
            }
            break;

          case "ACCESS_REVOKED":
            if (resourceType === "DOCUMENT") {
              await invalidatePermissions([resourceId]);
            }
            break;

          case "SUBSPACE_PERMISSION_UPDATED":
            // Invalidate all affected documents in the subspace
            if (affectedDocuments && affectedDocuments.length > 0) {
              await invalidatePermissions(affectedDocuments);
            }
            break;
        }

        return event;
      } catch (error) {
        console.error("Failed to handle permission update:", error);
        throw error;
      }
    },
    { manual: true },
  );
};

// Store selectors
export const usePermissionStoreSelectors = () => {
  const store = usePermissionStore();

  return {
    getAllDocumentPermissions: () => store.documentPermissions,
    getAllBatchPermissions: () => store.batchPermissions,
    getInvalidatedDocuments: () => Array.from(store.permissionInvalidations),
    hasInvalidatedDocument: (documentId: string) => store.permissionInvalidations.has(documentId),
  };
};

export default usePermissionStore;
