import { useEffect, useMemo, useCallback } from "react";
import { useCurrentDocument } from "@/hooks/use-current-document";
import { PermissionLevel } from "@idea/contracts";
import { useFetchDocumentPermission } from "@/stores/permission-store";

/**
 * Enhanced document permission hook that provides comprehensive permission checking
 * for documents with proper inheritance and real-time updates
 *
 * @param documentId The document ID to check permissions for
 * @param options Configuration options
 * @returns Permission information and utilities
 */
export function useDocumentPermission(
  documentId: string,
  options: {
    autoFetch?: boolean;
    includeInheritance?: boolean;
    realTimeUpdates?: boolean;
  } = {},
) {
  const { autoFetch = true, includeInheritance = true, realTimeUpdates = true } = options;

  const { run: fetchDocumentPermission, data: permissionData, loading: permissionLoading } = useFetchDocumentPermission();

  // Fetch enhanced permission level with inheritance when document changes
  useEffect(() => {
    if (documentId && autoFetch) {
      fetchDocumentPermission({
        documentId,
        includeInheritance,
      });
    }
  }, [documentId, autoFetch, includeInheritance, fetchDocumentPermission]);

  // Get permission level from enhanced resolution
  const permissionLevel: PermissionLevel = useMemo(() => {
    if (permissionData && "permissionLevel" in permissionData) {
      return permissionData.permissionLevel || "NONE";
    }
    return "NONE";
  }, [permissionData]);

  // Permission check utilities - use only enhanced permission system
  const canRead = useCallback(() => {
    return permissionLevel && permissionLevel !== "NONE";
  }, [permissionLevel]);

  const canEdit = useCallback(() => {
    return ["EDIT", "MANAGE", "OWNER"].includes(permissionLevel);
  }, [permissionLevel]);

  const canComment = useCallback(() => {
    return ["COMMENT", "EDIT", "MANAGE", "OWNER"].includes(permissionLevel);
  }, [permissionLevel]);

  const canShare = useCallback(() => {
    return ["MANAGE", "OWNER"].includes(permissionLevel);
  }, [permissionLevel]);

  const canDelete = useCallback(() => {
    return ["MANAGE", "OWNER"].includes(permissionLevel);
  }, [permissionLevel]);

  const canManage = useCallback(() => {
    // Use enhanced permission level as primary source
    return ["MANAGE", "OWNER"].includes(permissionLevel);
  }, [permissionLevel]);

  // Enhanced permission check with action parameter
  const hasPermission = useCallback(
    (action: string) => {
      switch (action.toLowerCase()) {
        case "read":
        case "view":
          return canRead();
        case "edit":
        case "update":
          return canEdit();
        case "comment":
          return canComment();
        case "share":
          return canShare();
        case "delete":
          return canDelete();
        case "manage":
        case "admin":
          return canManage();
        default:
          return false; // Unknown actions return false for security
      }
    },
    [canRead, canEdit, canComment, canShare, canDelete, canManage],
  );

  // Get permission context information
  const permissionContext = useMemo(() => {
    if (permissionData && "source" in permissionData) {
      return {
        source: permissionData.source || "UNKNOWN",
        inheritedFrom: permissionData.inheritedFrom,
        effectivePermissions: permissionData.effectivePermissions || {},
        subspaceContext: permissionData.subspaceContext,
        workspaceContext: permissionData.workspaceContext,
      };
    }
    return {
      source: "UNKNOWN" as const,
      inheritedFrom: undefined,
      effectivePermissions: {},
      subspaceContext: undefined,
      workspaceContext: undefined,
    };
  }, [permissionData]);

  const isLoading = permissionLoading;

  // Debug logging
  useEffect(() => {
    if (documentId) {
      console.log(`[useDocumentPermission] Document ${documentId}:`, {
        permissionLevel,
        permissionData,
        canRead: canRead(),
        canEdit: canEdit(),
        isLoading,
      });
    }
  }, [documentId, permissionLevel, permissionData, canRead, canEdit, isLoading]);

  return {
    // Permission level
    permissionLevel,

    // Permission checkers
    canRead,
    canEdit,
    canComment,
    canShare,
    canDelete,
    canManage,
    hasPermission,

    // Context information
    permissionContext,

    // Loading state
    isLoading,

    // Refresh permissions
    refresh: useCallback(() => {
      if (documentId) {
        fetchDocumentPermission({ documentId, includeInheritance });
      }
    }, [documentId, includeInheritance, fetchDocumentPermission]),
  };
}

/**
 * Hook specifically for the current document in the editor
 * Automatically uses the current document ID from context
 */
export function useCurrentDocumentPermission() {
  const currentDocument = useCurrentDocument();
  const documentId = currentDocument && "id" in currentDocument ? currentDocument.id : "";

  return useDocumentPermission(documentId, {
    autoFetch: true,
    includeInheritance: true,
    realTimeUpdates: true,
  });
}

/**
 * Simple permission check hook for basic use cases
 * Returns boolean for a specific permission on a document
 */
export function useDocumentPermissionCheck(documentId: string, action: string): boolean {
  const { hasPermission, isLoading } = useDocumentPermission(documentId, {
    autoFetch: true,
    includeInheritance: true,
  });

  // Return false while loading to be safe
  if (isLoading) return false;

  return hasPermission(action);
}

/**
 * Batch permission hook for checking permissions on multiple documents
 */
export function useBatchDocumentPermissions(documentIds: string[]) {
  const { run: fetchBatchPermissions, data: batchData, loading } = useFetchDocumentPermission();

  useEffect(() => {
    if (documentIds.length > 0) {
      fetchBatchPermissions({
        documentIds,
        includeInheritance: true,
      });
    }
  }, [documentIds, fetchBatchPermissions]);

  const getDocumentPermission = useCallback(
    (documentId: string) => {
      if (batchData && "permissions" in batchData) {
        return batchData.permissions?.[documentId] || "NONE";
      }
      return "NONE" as const;
    },
    [batchData],
  );

  const hasDocumentPermission = useCallback(
    (documentId: string, action: string) => {
      const permission = getDocumentPermission(documentId);

      switch (action.toLowerCase()) {
        case "read":
        case "view":
          return permission !== "NONE";
        case "edit":
        case "update":
          return ["EDIT", "MANAGE", "OWNER"].includes(permission);
        case "comment":
          return ["COMMENT", "EDIT", "MANAGE", "OWNER"].includes(permission);
        case "share":
        case "admin":
        case "manage":
          return ["MANAGE", "OWNER"].includes(permission);
        default:
          return false;
      }
    },
    [getDocumentPermission],
  );

  return {
    permissions: batchData && "permissions" in batchData ? batchData.permissions : {},
    getDocumentPermission,
    hasDocumentPermission,
    isLoading: loading,
  };
}
