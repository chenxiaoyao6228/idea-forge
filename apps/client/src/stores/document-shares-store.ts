import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";
import { documentApi } from "@/apis/document";
import useRequest from "@ahooksjs/use-request";
import { DocShareUser, DocShareGroup, DocShareItem, PermissionLevel } from "@idea/contracts";

// Store state
const useDocumentSharesStore = create<{
  shares: Record<string, DocShareItem[]>; // documentId -> shared users and groups
}>((set, get) => ({
  shares: {},
}));

// Basic data access
const EMPTY_ARRAY: DocShareItem[] = [];

export const useDocumentShares = (documentId: string) => {
  return useDocumentSharesStore((state) => state.shares[documentId] ?? EMPTY_ARRAY);
};

// Helper hooks to separate users and groups
export const useDocumentUserShares = (documentId: string) => {
  const shares = useDocumentShares(documentId);
  return useMemo(() => shares.filter((share): share is DocShareUser => share.type === "user"), [shares]);
};

export const useDocumentGroupShares = (documentId: string) => {
  const shares = useDocumentShares(documentId);
  return useMemo(() => shares.filter((share): share is DocShareGroup => share.type === "group"), [shares]);
};

// Fetch operation
export const useFetchDocumentShares = (documentId: string) => {
  return useRequest(
    async () => {
      try {
        const response = await documentApi.getDocumentShares(documentId);

        // Update store with fetched data
        useDocumentSharesStore.setState((state) => ({
          shares: { ...state.shares, [documentId]: (response as any).data || response },
        }));

        return response;
      } catch (error: any) {
        console.error(`Failed to fetch document shares for ${documentId}:`, error);
        toast.error("Failed to load shared users", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      ready: !!documentId,
      manual: true,
    },
  );
};

// Add share operation
export const useAddDocumentShare = (documentId: string) => {
  return useRequest(
    async (data: { targetUserIds: string[]; targetGroupIds: string[]; permission: "READ" | "EDIT"; includeChildDocuments?: boolean; workspaceId: string }) => {
      try {
        const response = await documentApi.shareDocument(documentId, data);

        // Update store with new shares
        useDocumentSharesStore.setState((state) => ({
          shares: { ...state.shares, [documentId]: (response as any).data || response },
        }));

        toast.success("Document shared successfully");
        return response;
      } catch (error: any) {
        console.error("Failed to share document:", error);
        toast.error("Failed to share document", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

// Update permission operation
export const useUpdateDocumentSharePermission = (documentId: string) => {
  return useRequest(
    async (data: { userId: string; permission: PermissionLevel }) => {
      try {
        const response = await documentApi.updateSharePermission(documentId, data);

        // Update store with updated shares
        useDocumentSharesStore.setState((state) => ({
          shares: { ...state.shares, [documentId]: (response as any).data || response },
        }));

        toast.success("Permission updated successfully");
        return response;
      } catch (error: any) {
        console.error("Failed to update permission:", error);
        toast.error("Failed to update permission", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

// Remove share operation
export const useRemoveDocumentShare = (documentId: string) => {
  return useRequest(
    async (data: { targetUserId: string }) => {
      try {
        const response = await documentApi.removeShare(documentId, data);

        // Update store with updated shares
        useDocumentSharesStore.setState((state) => ({
          shares: { ...state.shares, [documentId]: (response as any).data || response },
        }));

        toast.success("User removed from document");
        return response;
      } catch (error: any) {
        console.error("Failed to remove user:", error);
        toast.error("Failed to remove user", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

// Remove group share operation
export const useRemoveDocumentGroupShare = (documentId: string) => {
  return useRequest(
    async (data: { targetGroupId: string }) => {
      try {
        const response = await documentApi.removeGroupShare(documentId, data);

        // Update store with updated shares
        useDocumentSharesStore.setState((state) => ({
          shares: { ...state.shares, [documentId]: (response as any).data || response },
        }));

        toast.success("Group removed from document");
        return response;
      } catch (error: any) {
        console.error("Failed to remove group:", error);
        toast.error("Failed to remove group", {
          description: error.message,
        });
        throw error;
      }
    },
    {
      manual: true,
    },
  );
};

export default useDocumentSharesStore;
