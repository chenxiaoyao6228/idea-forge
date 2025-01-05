import { useEffect, useMemo } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";

export function useCollaborationProvider(documentId: string, user: { name: string; color: string }) {
  const provider = useMemo(() => {
    const doc = new Y.Doc();

    return new HocuspocusProvider({
      url: "ws://localhost:5001/collaboration",
      name: documentId,
      document: doc,
      token: "", // Add your auth token here if needed
      onAwarenessUpdate: ({ states }) => {
        console.log("Collaboration awareness updated:", states);
      },
      onClose: () => {
        console.log("Connection closed");
      },
      onConnect: () => {
        console.log("Connected to collaboration server");
      },
    });
  }, [documentId]);

  useEffect(() => {
    return () => {
      provider.destroy();
    };
  }, [provider]);

  return provider;
}
