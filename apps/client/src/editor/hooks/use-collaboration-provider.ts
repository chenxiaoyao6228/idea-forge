import { useEffect, useMemo, useRef } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import { CollabUser, useEditorStore } from "../../stores/editor-store";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const timeoutRef = useRef<any>();
  // Provider ref to access in callbacks
  const providerRef = useRef<HocuspocusProvider | null>(null);

  useEffect(() => {
    if (!editable) {
      return;
    }
    setCurrentDocument(documentId);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Only reset if we're actually switching to a different document
      resetDocumentState(documentId);
    };
  }, [documentId, editable, setCurrentDocument, resetDocumentState]);

  const provider = useMemo(() => {
    if (!documentId || !editable) {
      return null;
    }

    const doc = new Y.Doc();
    const indexeddbProvider = new IndexeddbPersistence(documentId, doc);

    indexeddbProvider.on("synced", () => {
      console.log("Content from IndexedDB loaded");
      queueMicrotask(() => {
        setCollaborationState(documentId, {
          isIndexedDBLoaded: true,
          status: "connecting",
        });
      });
    });

    const provider = new HocuspocusProvider({
      url: collabWsUrl,
      name: documentId,
      document: doc,
      token: collabToken,
      connect: false, // Don't connect immediately
      onAuthenticationFailed: ({ reason }) => {
        queueMicrotask(() => {
          setCollaborationState(documentId, {
            status: "unauthorized",
            error: reason || t("You don't have permission to access this document"),
          });
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

        queueMicrotask(() => {
          setCollaborationState(documentId, {
            activeUsers: Array.from(userMap.values()),
          });
        });
      },
      onConnect: () => {
        queueMicrotask(() => {
          setCollaborationState(documentId, {
            status: "collaborating",
            error: undefined,
            lastSyncedAt: new Date(),
          });
        });
      },
      onSynced: ({ state }) => {
        queueMicrotask(() => {
          setCollaborationState(documentId, {
            lastSyncedAt: state ? new Date() : undefined,
            pendingChanges: !state,
          });
        });
      },
    });

    doc.on("update", () => {
      if (provider.status !== "connected") {
        queueMicrotask(() => {
          setCollaborationState(documentId, {
            pendingChanges: true,
          });
        });
      }
    });

    providerRef.current = provider;
    return provider;
  }, [documentId, editable, collabWsUrl, collabToken, t]);

  // Handle connection timeout
  useEffect(() => {
    if (!editable || !provider) {
      return;
    }
    timeoutRef.current = setTimeout(() => {
      if (provider.status !== "connected") {
        setCollaborationState(documentId, {
          status: "error",
          error: t("Connection timed out. Please check your internet connection and try again."),
        });
      }
    }, CONNECTION_TIMEOUT);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [provider, documentId, editable, t]);

  // Initialize state and setup provider
  useEffect(() => {
    if (!editable || !provider) return;

    // Initialize collaboration state
    setCollaborationState(documentId, {
      activeUsers: [],
      isIndexedDBLoaded: false,
      status: "loading",
    });

    // Set provider in store
    setProvider(documentId, provider);

    // Set local awareness state with user info
    if (provider.awareness && user) {
      provider.awareness.setLocalState(user);
    }

    // initiate connection if not connected
    if (provider.status !== "connected") {
      console.log("Initiating connection...");
      provider.connect();
    }

    return () => {
      if (!provider) return;
      const status = provider.status;
      if (status === "disconnected" || status === "connecting") return;

      console.log("Cleaning up connection...");

      // Fix for: https://github.com/ueberdosis/hocuspocus/issues/594#issuecomment-1740599461
      provider.configuration.websocketProvider.disconnect();
      provider.disconnect();
    };
  }, [documentId, provider, editable, user, setCollaborationState, setProvider]);

  // Add disconnect detection
  useEffect(() => {
    if (!provider) return;

    const onConnect = () => {
      console.log("Provider connected");
    };

    const onDisconnect = ({ event }: { event: CloseEvent }) => {
      console.log("Provider disconnected", event);
      if (event.type === "close") {
        setTimeout(() => {
          if (!provider) return;
          console.log("3s timeout after disconnect, Provider status is: ", provider.status);
          if (provider.status === "connected") return;
          queueMicrotask(() => {
            setCollaborationState(documentId, {
              status: "offline",
              error: t("Disconnected from server"),
            });
          });
        }, 3000);
      }
    };

    provider.on("connect", onConnect);
    provider.on("disconnect", onDisconnect);

    return () => {
      if (provider) {
        provider.off("connect", onConnect);
        provider.off("disconnect", onDisconnect);
      }
    };
  }, [provider, documentId, t, setCollaborationState]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (provider) {
        try {
          provider.destroy();
        } catch (error) {
          console.warn("Error destroying collaboration provider:", error);
        }
      }
    };
  }, [provider]);

  return provider;
}
