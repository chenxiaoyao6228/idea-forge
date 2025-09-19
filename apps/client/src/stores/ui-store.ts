import { create } from "zustand";

// Minimal store - only data state (UI state moved to local components)
const useUIStore = create<{
  activeDocumentId?: string;
}>((set) => ({
  activeDocumentId: undefined,
}));

export default useUIStore;
