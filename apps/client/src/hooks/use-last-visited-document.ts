import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCurrentWorkspace } from "@/stores/workspace-store";
import { usePersonalSubspace } from "@/stores/subspace-store";
import { documentApi } from "@/apis/document";
import { userApi } from "@/apis/user";

const LAST_VISITED_DOC_KEY = "last-visited-doc";

/**
 * Hook to track the last visited document in localStorage and backend
 * Stores per-workspace to handle multiple workspaces correctly
 */
export const useTrackLastVisitedDocument = () => {
  const { docId } = useParams();
  const currentWorkspace = useCurrentWorkspace();
  const workspaceId = currentWorkspace?.id;

  useEffect(() => {
    if (docId && workspaceId) {
      // Update localStorage immediately (instant for next visit)
      const localKey = `${LAST_VISITED_DOC_KEY}:${workspaceId}`;
      localStorage.setItem(localKey, docId);

      // Update backend asynchronously (for cross-device sync)
      userApi
        .updateLastVisitedDoc({
          workspaceId,
          documentId: docId,
        })
        .catch((error) => {
          // Non-critical - just log the error
          console.warn("Failed to update last visited document on server:", error);
        });
    }
  }, [docId, workspaceId]);
};

/**
 * Create a welcome document for new workspaces
 * Uses server-side API that converts markdown template to Yjs format
 */
async function createWelcomeDocument(workspaceId: string, personalSubspaceId: string): Promise<string> {
  try {
    const response = await documentApi.createWelcomeDocument(workspaceId, personalSubspaceId);
    return response.id;
  } catch (error) {
    console.error("Failed to create welcome document:", error);
    throw error;
  }
}

/**
 * Hook to redirect to last visited document on root path
 * Uses hybrid approach: localStorage first (instant), then backend (synced)
 */
export const useRedirectToLastVisited = () => {
  const navigate = useNavigate();
  const currentWorkspace = useCurrentWorkspace();
  const personalSubspace = usePersonalSubspace();
  const workspaceId = currentWorkspace?.id;
  const { docId } = useParams();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Only redirect if we're on the root path (no docId) and not already redirecting
    if (!docId && workspaceId && !isRedirecting) {
      setIsRedirecting(true);

      const localKey = `${LAST_VISITED_DOC_KEY}:${workspaceId}`;
      const localLastDocId = localStorage.getItem(localKey);

      // Strategy 1: Try localStorage first (instant redirect)
      if (localLastDocId) {
        // Verify the document still exists and user has access
        documentApi
          .getDocument(localLastDocId)
          .then(() => {
            navigate(`/${localLastDocId}`, { replace: true });
            setIsRedirecting(false);
          })
          .catch((error) => {
            // Document deleted or no access - clear from localStorage and try server
            console.warn("Last visited document not accessible:", error);
            localStorage.removeItem(localKey);
            tryServerLastVisited();
          });
        return;
      }

      // Strategy 2: Fallback to server (slower but synced across devices)
      tryServerLastVisited();
    }

    async function tryServerLastVisited() {
      if (!workspaceId) {
        setIsRedirecting(false);
        return;
      }

      try {
        const lastVisitedDoc = await userApi.getLastVisitedDoc(workspaceId);

        if (lastVisitedDoc?.documentId) {
          // Verify document exists
          await documentApi.getDocument(lastVisitedDoc.documentId);

          // Update localStorage for next time
          const localKey = `${LAST_VISITED_DOC_KEY}:${workspaceId}`;
          localStorage.setItem(localKey, lastVisitedDoc.documentId);

          navigate(`/${lastVisitedDoc.documentId}`, { replace: true });
          setIsRedirecting(false);
        } else {
          // No last visited document - create welcome doc
          await handleNoLastVisitedDoc();
        }
      } catch (error) {
        console.warn("Failed to get last visited document from server:", error);
        // Create welcome document as fallback
        await handleNoLastVisitedDoc();
      }
    }

    async function handleNoLastVisitedDoc() {
      if (!workspaceId || !personalSubspace?.id) {
        setIsRedirecting(false);
        return;
      }

      try {
        // Create welcome document
        const welcomeDocId = await createWelcomeDocument(workspaceId, personalSubspace.id);

        // Update localStorage
        const localKey = `${LAST_VISITED_DOC_KEY}:${workspaceId}`;
        localStorage.setItem(localKey, welcomeDocId);

        // Redirect to welcome document
        navigate(`/${welcomeDocId}`, { replace: true });
        setIsRedirecting(false);
      } catch (error) {
        console.error("Failed to create welcome document:", error);
        setIsRedirecting(false);
        // Could show an error state or empty state here
      }
    }
  }, [docId, workspaceId, personalSubspace?.id, navigate, isRedirecting]);

  return { isRedirecting };
};
