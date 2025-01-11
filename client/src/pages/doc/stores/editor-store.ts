import { create } from "zustand";
import { HocuspocusProvider } from "@hocuspocus/provider";

export type CollaborationStatus = "connecting" | "connected" | "disconnected";

interface CollabUser {
  clientId?: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
}

interface EditorState {
  provider: HocuspocusProvider | null;
  isConnected: boolean;
  isSynced: boolean;
  status: CollaborationStatus;
  activeUsers: CollabUser[];
  setProvider: (provider: HocuspocusProvider) => void;
  setCollaborationState: (state: Partial<EditorState>) => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  provider: null,
  isConnected: false,
  isSynced: false,
  status: "connecting",
  activeUsers: [],
  setProvider: (provider) => set({ provider }),
  setCollaborationState: (state) => set((prev) => ({ ...prev, ...state })),
}));
