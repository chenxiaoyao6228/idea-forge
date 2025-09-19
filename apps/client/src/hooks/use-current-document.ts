import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import useDocumentStore, { documentSelectors, useGetDocument } from "@/stores/document-store";
import { useRefCallback } from "@/hooks/use-ref-callback";
import useSubSpaceStore from "@/stores/subspace";
import { useFindNavigationNodeInSharedDocuments } from "@/stores/share-store";
import { NavigationNode } from "@idea/contracts";
import { documentApi } from "@/apis/document";
import useRequest from "@ahooksjs/use-request";
import { useDebounce } from "react-use";

// ✅ Custom hook to find navigation node for a document ID across all subspaces and shared documents
export const useNavigationNodeForDocument = () => {
  const findNavigationNodeInSharedDocuments = useFindNavigationNodeInSharedDocuments();

  const getNavigationNodeForDocument = useRefCallback((documentId: string): NavigationNode | null => {
    if (!documentId) return null;

    const subspaceStore = useSubSpaceStore.getState();

    // 1. Check personal subspace
    const personalNode = subspaceStore.findNavigationNodeInPersonalSubspace(documentId);
    if (personalNode) return personalNode;

    // 2. Check shared-with-me documents
    const sharedNode = findNavigationNodeInSharedDocuments(documentId);
    if (sharedNode) return sharedNode;

    // 3. Check all subspaces
    const allSubspaces = subspaceStore.entities;
    for (const subspace of Object.values(allSubspaces)) {
      const node = subspaceStore.findNavigationNodeInSubspace(subspace.id, documentId);
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

      const response = await documentApi.getDocument(debouncedDocumentId);
      const { data } = response as any;

      if (!data?.document) {
        throw new Error("Document not found");
      }

      console.log("✅ useCurrentDocument: API call successful", { documentId: data.document.id, title: data.document.title });

      // Update the store for caching
      useDocumentStore.setState((state) => ({
        documents: { ...state.documents, [data.document.id]: data.document },
      }));

      return data.document;
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
