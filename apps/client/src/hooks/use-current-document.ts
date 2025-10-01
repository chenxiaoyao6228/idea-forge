import { useParams } from "react-router-dom";
import useDocumentStore from "@/stores/document-store";
import { useRefCallback } from "@/hooks/use-ref-callback";
import useSubSpaceStore, { useFindNavigationNodeInPersonalSubspace, useFindNavigationNodeInSubspace } from "@/stores/subspace-store";
import { useFindNavigationNodeInSharedDocuments } from "@/stores/share-store";
import { NavigationNode } from "@idea/contracts";
import { documentApi } from "@/apis/document";
import useRequest from "@ahooksjs/use-request";
import { ErrorCodeEnum } from "@api/_shared/constants/api-response-constant";
import { useInitializeSubjectAbilities } from "@/stores/ability-store";

// ✅ Custom hook to find navigation node for a document ID across all subspaces and shared documents
export const useNavigationNodeForDocument = () => {
  const findNavigationNodeInSharedDocuments = useFindNavigationNodeInSharedDocuments();
  const findNavigationNodeInPersonalSubspace = useFindNavigationNodeInPersonalSubspace();
  const findNavigationNodeInSubspace = useFindNavigationNodeInSubspace();

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

// ✅ Simplified hook to get current document with fresh data using useRequest debounce
export const useFetchCurrentDocument = () => {
  const { docId: activeDocumentId } = useParams();
  const initializeSubjectAbilities = useInitializeSubjectAbilities();

  const {
    data: document,
    loading,
    error,
  } = useRequest(
    async () => {
      if (!activeDocumentId) {
        return null;
      }

      const response = (await documentApi.getDocument(activeDocumentId)) as any;
      const { doc, permissions } = response;

      if (!doc) {
        throw new Error(ErrorCodeEnum.DocumentNotFound);
      }
      console.log("✅ useCurrentDocument: Document fetched successfully", { documentId: doc.id, title: doc.title });

      // Update the store for caching
      useDocumentStore.setState((state) => ({
        documents: { ...state.documents, [doc.id]: doc },
        activeDocumentId: doc.id,
      }));

      // Initialize document abilities
      if (permissions && Object.keys(permissions).length > 0) {
        console.log("🔄 useCurrentDocument: Initializing subject abilities", { permissions });
        initializeSubjectAbilities(permissions);
      }

      return doc;
    },
    {
      ready: !!activeDocumentId, // Always fetch when we have a document ID
      refreshDeps: [activeDocumentId], // Re-fetch when document ID changes
    },
  );

  // Return loading state if we're fetching
  if (loading) {
    return { isLoading: true };
  }

  // Return error state if there was an error
  if (error) {
    return { error };
  }

  // Return the fresh document data
  return document;
};

// ✅ Hook to get current document ID from URL params
export const useCurrentDocumentId = () => {
  const { docId } = useParams();
  return docId;
};
