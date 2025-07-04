import { create } from "zustand";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { TableOfContentDataItem } from "@tiptap/extension-table-of-contents";
import { Editor } from "@tiptap/react";

export type DocumentStatus =
  | "loading" // Initial state
  | "connecting" // Connecting to server
  | "collaborating" // Connected and synced
  | "offline" // Offline mode
  | "error" // Error state
  | "unauthorized" // No permission
  | "readonly"; // Read-only mode

export interface CollabUser {
  clientId?: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  lastActive: string;
}

interface DocumentState {
  status: DocumentStatus;
  error?: string;
  activeUsers: CollabUser[];
  pendingChanges: boolean;
  lastSyncedAt?: Date;
  isIndexedDBLoaded: boolean;
  provider: HocuspocusProvider | null;
}

interface EditorState {
  documents: Record<string, DocumentState>;
  currentDocumentId: string | null;
  editor: Editor | null;
  tocItems: TableOfContentDataItem[];
  setProvider: (documentId: string, provider: HocuspocusProvider) => void;
  setCollaborationState: (documentId: string, state: Partial<DocumentState>) => void;
  resetDocumentState: (documentId: string) => void;
  setCurrentDocument: (documentId: string) => void;
  setTocItems: (items: TableOfContentDataItem[]) => void;
  setEditor: (editor: Editor) => void;
}

const initialDocumentState: DocumentState = {
  status: "loading",
  activeUsers: [],
  error: undefined,
  pendingChanges: false,
  lastSyncedAt: undefined,
  isIndexedDBLoaded: false,
  provider: null,
};

export const useEditorStore = create<EditorState>((set) => ({
  documents: {},
  currentDocumentId: null,
  tocItems: [],
  editor: null,
  setProvider: (documentId, provider) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [documentId]: {
          ...(state.documents[documentId] || initialDocumentState),
          provider,
        },
      },
    })),
  setCollaborationState: (documentId, newState) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [documentId]: {
          ...(state.documents[documentId] || initialDocumentState),
          ...newState,
        },
      },
    })),
  resetDocumentState: (documentId) =>
    set((state) => ({
      documents: {
        ...state.documents,
        [documentId]: { ...initialDocumentState },
      },
    })),
  setCurrentDocument: (documentId) => set({ currentDocumentId: documentId }),
  setTocItems: (items) => set({ tocItems: items }),
  setEditor: (editor) => set({ editor }),
}));

export function useCurrentDocumentState() {
  const { currentDocumentId, documents } = useEditorStore();
  return currentDocumentId ? documents[currentDocumentId] : null;
}
