import { create } from "zustand";

// Minimal store - only data state (UI state moved to local components)
const useUIStore = create<{
  activeDocumentId?: string;
  commentsSidebarOpen: boolean;
  setCommentsSidebarOpen: (open: boolean) => void;
  pendingDraftCommentId?: string;
  setPendingDraftComment: (id?: string) => void;
  focusedCommentId?: string;
  setFocusedCommentId: (id?: string) => void;
}>((set) => ({
  activeDocumentId: undefined,
  commentsSidebarOpen: false,
  setCommentsSidebarOpen: (open) => set({ commentsSidebarOpen: open }),
  pendingDraftCommentId: undefined,
  setPendingDraftComment: (id) => set({ pendingDraftCommentId: id }),
  focusedCommentId: undefined,
  setFocusedCommentId: (id) => set({ focusedCommentId: id }),
}));

export default useUIStore;
