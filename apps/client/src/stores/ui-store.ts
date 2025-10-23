import { create } from "zustand";

// Minimal store - only data state (UI state moved to local components)
const useUIStore = create<{
  activeDocumentId?: string;
  commentsSidebarOpen: boolean;
  setCommentsSidebarOpen: (open: boolean) => void;
  pendingDraftCommentId?: string;
  pendingDraftAnchorText?: string;
  setPendingDraftComment: (id?: string, anchorText?: string) => void;
}>((set) => ({
  activeDocumentId: undefined,
  commentsSidebarOpen: true,
  setCommentsSidebarOpen: (open) => set({ commentsSidebarOpen: open }),
  pendingDraftCommentId: undefined,
  pendingDraftAnchorText: undefined,
  setPendingDraftComment: (id, anchorText) => set({ pendingDraftCommentId: id, pendingDraftAnchorText: anchorText }),
}));

export default useUIStore;
