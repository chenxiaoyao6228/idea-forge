import useDocumentStore, { documentSelectors } from "@/stores/document";
import useUIStore from "@/stores/ui";

export const useCurrentDocument = () => {
  const activeDocumentId = useUIStore((state) => state.activeDocumentId);
  // Always call the store hook, even if activeDocumentId is null
  const currentDocument = useDocumentStore((state) => (activeDocumentId ? documentSelectors.selectById(state, activeDocumentId) : null));
  return currentDocument;
};
