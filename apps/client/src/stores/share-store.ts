import { create } from "zustand";
import { useMemo } from "react";
import { toast } from "sonner";
import { documentApi } from "@/apis/document";
import useRequest from "@ahooksjs/use-request";
import { useRefCallback } from "@/hooks/use-ref-callback";
import useDocumentStore, { DocumentEntity } from "./document-store";
import useWorkspaceStore from "./workspace-store";
import { NavigationNodeType } from "@idea/contracts";

// Minimal store - only state
const useSharedWithMeStore = create<{
  documents: DocumentEntity[];
  // Pagination state
  page: number;
  limit: number;
  total: number;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasNextPage: boolean;
  error: string | null;
}>((set) => ({
  documents: [],
  page: 1,
  limit: 100,
  total: 0,
  isLoading: false,
  isLoadingMore: false,
  hasNextPage: false,
  error: null,
}));

// Basic data access
export const useSharedDocuments = () => {
  return useSharedWithMeStore((state) => state.documents);
};

// Computed values
export const useSharedWithMePagination = () => {
  const page = useSharedWithMeStore((state) => state.page);
  const limit = useSharedWithMeStore((state) => state.limit);
  const total = useSharedWithMeStore((state) => state.total);
  const isLoading = useSharedWithMeStore((state) => state.isLoading);
  const isLoadingMore = useSharedWithMeStore((state) => state.isLoadingMore);

  return useMemo(
    () => ({
      page,
      limit,
      total,
      isLoading,
      isLoadingMore,
      hasNextPage: page * limit < total,
      hasDocuments: total > 0,
      isVisible: total > 0 || isLoading,
    }),
    [page, limit, total, isLoading, isLoadingMore],
  );
};

// Fetch operation
export const useFetchSharedDocuments = () => {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  return useRequest(
    async () => {
      try {
        const state = useSharedWithMeStore.getState();

        // Prevent duplicate requests
        if (state.isLoading) return;

        // Set loading state
        useSharedWithMeStore.setState({ isLoading: true, error: null });

        // API call for first page
        const response = await documentApi.getSharedWithMe({
          page: 1,
          limit: state.limit,
          workspaceId: currentWorkspace!.id,
        });

        // Update store with first page data
        useSharedWithMeStore.setState({
          documents: response.data.documents,
          page: 1,
          total: response.pagination.total,
          hasNextPage: response.pagination.page * response.pagination.limit < response.pagination.total,
        });

        // Update other stores
        useDocumentStore.setState((state) => {
          const newDocuments = { ...state.documents };
          response.data.documents.forEach((doc: DocumentEntity) => {
            newDocuments[doc.id] = doc;
          });
          return { documents: newDocuments };
        });

        return response.data.documents;
      } catch (error: any) {
        console.error("Failed to fetch shared documents:", error);
        toast.error("Failed to fetch shared documents", {
          description: error.message,
        });
        useSharedWithMeStore.setState({ error: error.message });
        throw error;
      } finally {
        useSharedWithMeStore.setState({ isLoading: false });
      }
    },
    {
      ready: !!currentWorkspace,
      manual: true,
    },
  );
};

// Load more operation
export const useLoadMoreSharedDocuments = () => {
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);

  return useRequest(
    async () => {
      try {
        const state = useSharedWithMeStore.getState();

        // Prevent duplicate requests or if no more pages
        if (state.isLoadingMore || !state.hasNextPage) return;

        // Set loading more state
        useSharedWithMeStore.setState({ isLoadingMore: true });

        // API call for next page
        const response = await documentApi.getSharedWithMe({
          page: state.page + 1,
          limit: state.limit,
          workspaceId: currentWorkspace!.id,
        });

        // Append new data to existing documents
        useSharedWithMeStore.setState({
          documents: [...state.documents, ...response.data.documents],
          page: state.page + 1,
          hasNextPage: response.pagination.page * response.pagination.limit < response.pagination.total,
        });

        // Update other stores
        useDocumentStore.setState((state) => {
          const newDocuments = { ...state.documents };
          response.data.documents.forEach((doc: DocumentEntity) => {
            newDocuments[doc.id] = doc;
          });
          return { documents: newDocuments };
        });

        return response.data.documents;
      } catch (error: any) {
        console.error("Failed to load more shared documents:", error);
        toast.error("Failed to load more documents", {
          description: error.message,
        });
        throw error;
      } finally {
        useSharedWithMeStore.setState({ isLoadingMore: false });
      }
    },
    {
      ready: !!currentWorkspace,
      manual: true,
    },
  );
};

// Navigation logic
export const useFindNavigationNodeInSharedDocuments = () => {
  const documents = useSharedWithMeStore((state) => state.documents);

  return useRefCallback((documentId: string) => {
    const document = documents.find((doc) => doc.id === documentId);

    if (!document) return null;

    // Convert DocumentEntity to NavigationNode
    return {
      id: document.id,
      title: document.title,
      type: NavigationNodeType.Document,
      url: `/${document.id}`,
      children: [],
      parent: null,
    };
  });
};

// WebSocket handlers
export const useSharedWithMeWebsocketHandlers = () => {
  // Call hooks at the top level
  const { run: fetchSharedDocuments } = useFetchSharedDocuments();

  const handleWebsocketAbilityChange = useRefCallback((abilities: Record<string, Record<string, boolean>>) => {
    // No longer needed - abilities are handled by the unified ability store
    // Trigger refetch to get updated document list
    fetchSharedDocuments();
  });

  const handleWebsocketDocumentShare = useRefCallback((document: DocumentEntity) => {
    const state = useSharedWithMeStore.getState();

    // Check if document already exists to avoid duplicates
    const existingIndex = state.documents.findIndex((doc) => doc.id === document.id);
    if (existingIndex >= 0) {
      // Update existing document
      const updatedDocuments = [...state.documents];
      updatedDocuments[existingIndex] = document;
      useSharedWithMeStore.setState({
        documents: updatedDocuments,
        total: updatedDocuments.length,
      });
    } else {
      // Add new document to the beginning
      const updatedDocuments = [document, ...state.documents];
      useSharedWithMeStore.setState({
        documents: updatedDocuments,
        total: updatedDocuments.length,
      });
    }
  });

  const handleWebsocketReconnect = useRefCallback(() => {
    useSharedWithMeStore.setState({
      page: 1,
      documents: [],
      hasNextPage: false,
      total: 0,
      error: null,
    });
    fetchSharedDocuments();
  });

  return {
    handleWebsocketAbilityChange,
    handleWebsocketDocumentShare,
    handleWebsocketReconnect,
  };
};

export default useSharedWithMeStore;
