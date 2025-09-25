import { useParams } from "react-router-dom";
import { useState } from "react";
import useDocumentStore, { useGetDocument } from "@/stores/document-store";
import { useRefCallback } from "@/hooks/use-ref-callback";
import useSubSpaceStore from "@/stores/subspace-store";
import { useFindNavigationNodeInSharedDocuments } from "@/stores/share-store";
import { NavigationNode } from "@idea/contracts";
import { documentApi } from "@/apis/document";
import useRequest from "@ahooksjs/use-request";
import { useDebounce } from "react-use";
import { ErrorCodeEnum } from "@api/_shared/constants/api-response-constant";

// Direct functions for navigation node finding (can be called from within hooks)
const findNavigationNodeInPersonalSubspace = (documentId: string) => {
  const subspaces = useSubSpaceStore.getState().subspaces;
  const personalSubspace = Object.values(subspaces).find((s) => s.type === "PERSONAL");
  if (!personalSubspace?.navigationTree) return null;

  const findNavigationNodeInTree = (nodes: NavigationNode[], targetId: string): NavigationNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNavigationNodeInTree(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  return findNavigationNodeInTree(personalSubspace.navigationTree, documentId);
};

const findNavigationNodeInSubspace = (subspaceId: string, documentId: string) => {
  const subspaces = useSubSpaceStore.getState().subspaces;
  const subspace = subspaces[subspaceId];
  if (!subspace?.navigationTree) return null;

  const findNavigationNodeInTree = (nodes: NavigationNode[], targetId: string): NavigationNode | null => {
    for (const node of nodes) {
      if (node.id === targetId) {
        return node;
      }
      if (node.children && node.children.length > 0) {
        const found = findNavigationNodeInTree(node.children, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  return findNavigationNodeInTree(subspace.navigationTree, documentId);
};

// ✅ Custom hook to find navigation node for a document ID across all subspaces and shared documents
export const useNavigationNodeForDocument = () => {
  const findNavigationNodeInSharedDocuments = useFindNavigationNodeInSharedDocuments();

  const getNavigationNodeForDocument = useRefCallback((documentId: string): NavigationNode | null => {
    if (!documentId) return null;

    // 1. Check personal subspace
    const personalNode = findNavigationNodeInPersonalSubspace(documentId);
    if (personalNode) return personalNode;

    // 2. Check shared-with-me documents
    const sharedNode = findNavigationNodeInSharedDocuments(documentId);
    if (sharedNode) return sharedNode;

    // 3. Check all subspaces
    const allSubspaces = useSubSpaceStore.getState().subspaces;
    for (const subspace of Object.values(allSubspaces)) {
      const node = findNavigationNodeInSubspace(subspace.id, documentId);
      if (node) return node;
    }

    return null;
  });

  return { getNavigationNodeForDocument };
};

// ✅ Updated hook to get current document with auto-fetching using useRequest
export const useCurrentDocument = () => {
  const { docId: activeDocumentId } = useParams();
  const [debouncedDocumentId, setDebouncedDocumentId] = useState<string | null>(null);

  // Get the full document from the document store (for cached data)
  const getDocument = useGetDocument();
  const cachedDocument = activeDocumentId ? getDocument(activeDocumentId) : null;

  // Debounce the document ID to prevent rapid API calls
  useDebounce(
    () => {
      console.log("🔄 useCurrentDocument: Debouncing document ID", { activeDocumentId, cachedDocument: !!cachedDocument });
      setDebouncedDocumentId(activeDocumentId || null);
    },
    300, // 300ms debounce delay
    [activeDocumentId],
  );

  // Use useRequest to fetch document details with caching
  const {
    data: fetchedDocument,
    loading,
    error,
  } = useRequest(
    async () => {
      console.log("🚀 useCurrentDocument: Starting API call", { debouncedDocumentId, cachedDocument: !!cachedDocument });

      if (!debouncedDocumentId) {
        return null;
      }

      const response = (await documentApi.getDocument(debouncedDocumentId)) as any;
      const { data } = response;

      if (!data) {
        throw new Error(ErrorCodeEnum.DocumentNotFound);
      }

      console.log("✅ useCurrentDocument: API call successful", { documentId: data.id, title: data.title });

      // Update the store for caching
      useDocumentStore.setState((state) => ({
        documents: { ...state.documents, [data.id]: data },
      }));

      return data;
    },
    {
      ready: !!debouncedDocumentId && !cachedDocument, // Only run if we have a debounced ID and no cached data
      refreshDeps: [debouncedDocumentId], // Re-run when debouncedDocumentId changes
      onError: (err) => {
        console.error("❌ useCurrentDocument: API call failed:", err);
      },
    },
  );

  // Return loading state if we're fetching
  if (activeDocumentId && !cachedDocument && loading) {
    return { isLoading: true };
  }

  // Return error state if there was an error
  if (error) {
    return { error };
  }

  // Return cached document if available, otherwise return fetched document data
  return cachedDocument || fetchedDocument;
};

// ✅ Hook to get current document ID from URL params
export const useCurrentDocumentId = () => {
  const { docId } = useParams();
  return docId;
};
