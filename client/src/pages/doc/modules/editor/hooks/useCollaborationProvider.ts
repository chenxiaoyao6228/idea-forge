import { useEffect, useMemo } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { CollaborationStatus, useEditorStore } from "../../../stores/editor-store";

export function useCollaborationProvider(documentId: string, user: { name: string; color: string; email?: string }) {
  const { setProvider, setCollaborationState } = useEditorStore();

  const provider = useMemo(() => {
    const doc = new Y.Doc();

    const provider = new HocuspocusProvider({
      url: "ws://localhost:5001/collaboration",
      name: documentId,
      document: doc,
      token: "",
      onAwarenessUpdate: ({ states }) => {
        const activeUsers = states.map((state) => ({
          clientId: state.clientId.toString(),
          name: state.user?.name || "Anonymous",
          email: state.user?.email,
          avatar: state.user?.avatar,
          color: state.user?.color || "#000000",
        }));
        setCollaborationState({ activeUsers });
      },
      onClose: () => {
        setCollaborationState({
          isConnected: false,
          status: "disconnected",
        });
      },
      onConnect: () => {
        setCollaborationState({
          isConnected: true,
          status: "connected",
        });
      },
      onStatus: ({ status }) => {
        setCollaborationState({ status: status as CollaborationStatus });
      },
      onSynced: ({ state }) => {
        setCollaborationState({ isSynced: state });
      },
    });

    setProvider(provider);
    return provider;
  }, [documentId, setProvider, setCollaborationState]);

  useEffect(() => {
    return () => {
      provider.destroy();
    };
  }, [provider]);

  return provider;
}
