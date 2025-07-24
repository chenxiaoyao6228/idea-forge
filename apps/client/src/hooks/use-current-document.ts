import { useParams } from "react-router-dom";
import useDocumentStore, { documentSelectors } from "@/stores/document";
import useUIStore from "@/stores/ui";

// FIXME:
export const useCurrentDocument = () => {
  const activeDocumentId = useUIStore((state) => state.activeDocumentId);
  // Always call the store hook, even if activeDocumentId is null
  const currentDocument = useDocumentStore((state) => (activeDocumentId ? documentSelectors.selectById(state, activeDocumentId) : null));
  return currentDocument;
};

export const useCurrentDocumentId = () => {
  const { docId } = useParams();
  const activeDocumentId = useUIStore((state) => state.activeDocumentId);
  const setActiveDocumentId = useUIStore((state) => state.setActiveDocumentId);
  if (docId && docId !== activeDocumentId) {
    setActiveDocumentId(docId);
  }
  return activeDocumentId;
};
