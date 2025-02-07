import { useEffect, useMemo, useRef } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import { CollabUser, useEditorStore } from "../../../stores/editor-store";
import { getEnvVariable } from "@/lib/env";

const CONNECTION_TIMEOUT = 10000;

interface Props {
  documentId: string;
  user: { name: string; color: string; email?: string };
  editable: boolean;
  collabWsUrl: string;
  collabToken: string;
}

export function useCollaborationProvider({ documentId, user, editable, collabWsUrl, collabToken }: Props) {
  const setProvider = useEditorStore((state) => state.setProvider);
  const setCollaborationState = useEditorStore((state) => state.setCollaborationState);
  const resetDocumentState = useEditorStore((state) => state.resetDocumentState);
  const setCurrentDocument = useEditorStore((state) => state.setCurrentDocument);
  const timeoutRef = useRef<any>();

  useEffect(() => {
    if (!editable) {
      return;
    }
    setCurrentDocument(documentId);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      resetDocumentState(documentId);
    };
  }, [documentId, editable]);

  const provider = useMemo(() => {
    const doc = new Y.Doc();

    // reset collaboration state
    setCollaborationState(documentId, {
      activeUsers: [],
      isIndexedDBLoaded: false,
      status: "loading",
    });

    const indexeddbProvider = new IndexeddbPersistence(documentId, doc);
    indexeddbProvider.on("synced", () => {
      console.log("Content from IndexedDB loaded");
      setCollaborationState(documentId, {
        isIndexedDBLoaded: true,
        status: "connecting",
      });
    });

    const provider = new HocuspocusProvider({
      url: collabWsUrl,
      name: documentId,
      document: doc,
      token: collabToken,
      onAuthenticationFailed: ({ reason }) => {
        setCollaborationState(documentId, {
          status: "unauthorized",
          error: reason || "You don't have permission to access this document",
        });
      },
      onAwarenessUpdate: ({ states }) => {
        const userMap = new Map<string, CollabUser>();

        states.forEach((state) => {
          const userId = state.user?.email || state.clientId.toString();

          userMap.set(userId, {
            clientId: state.clientId.toString(),
            name: state.user?.name || "Anonymous",
            email: state.user?.email,
            avatar: state.user?.avatar,
            color: state.user?.color || "#000000",
            lastActive: new Date().toISOString(),
          });
        });

        setCollaborationState(documentId, {
          activeUsers: Array.from(userMap.values()),
        });
      },
      onConnect: () => {
        setCollaborationState(documentId, {
          status: "collaborating",
          error: undefined,
          lastSyncedAt: new Date(),
        });
      },
      onDisconnect: () => {
        setCollaborationState(documentId, {
          status: "offline",
          error: "Disconnected from server",
        });
      },
      onClose: () => {
        setCollaborationState(documentId, {
          status: "offline",
          error: "Disconnected from server",
        });
      },
      onSynced: ({ state }) => {
        setCollaborationState(documentId, {
          lastSyncedAt: state ? new Date() : undefined,
          pendingChanges: !state,
        });
      },
    });

    doc.on("update", () => {
      if (provider.status !== "connected") {
        setCollaborationState(documentId, {
          pendingChanges: true,
        });
      }
    });

    setProvider(documentId, provider);
    return provider;
  }, [documentId, editable]);

  // Handle connection timeout
  useEffect(() => {
    if (!editable) {
      return;
    }
    timeoutRef.current = setTimeout(() => {
      if (provider.status !== "connected") {
        setCollaborationState(documentId, {
          status: "error",
          error: "Connection timed out. Please check your internet connection and try again.",
        });
      }
    }, CONNECTION_TIMEOUT);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [provider, documentId, editable]);

  // Cleanup
  useEffect(() => {
    return () => {
      provider.destroy();
    };
  }, [provider]);

  return provider;
}
