import * as React from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarLink } from "./sidebar-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useDocumentStore, { useFetchDocumentChildren, useGetDocumentAsNavigationNode, useCurrentDocumentId } from "@/stores/document-store";
import type { DocumentEntity } from "@/stores/document-store";
import { useRefCallback } from "@/hooks/use-ref-callback";

interface ShareWithMeLinkProps {
  document: DocumentEntity;
  depth?: number;
  rootSharedDocumentId?: string;
}

export function ShareWithMeLink({ document: initialDocument, depth = 0, rootSharedDocumentId }: ShareWithMeLinkProps) {
  // For root shared documents, use the document's own ID as the root shared document ID
  const sharedDocId = rootSharedDocumentId || initialDocument.id;
  const { t } = useTranslation();
  const activeDocumentId = useCurrentDocumentId();
  const { run: fetchChildren } = useFetchDocumentChildren();
  const getDocumentAsNavigationNode = useGetDocumentAsNavigationNode();
  const allDocuments = useDocumentStore((state) => state.documents);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [userToggled, setUserToggled] = useState(false);

  // Get the current document from the store, which will be updated by websocket events
  const document = useDocumentStore((state) => state.documents[initialDocument.id]) || initialDocument;

  // Auto-expand if contains active document or is in path to active document
  /**
   * Check if this document is in the path to the currently active document
   * This enables auto-expansion of parent folders containing the active document
   */

  const isInPathToActiveDocument = useCallback(() => {
    if (!activeDocumentId || !document?.id) return false;

    const node = getDocumentAsNavigationNode(document.id);
    if (!node) return false;

    // Recursively check if active document is in this document's subtree
    const checkSubtree = (children: any[]): boolean => {
      return children.some((child) => {
        if (child.id === activeDocumentId) return true;
        return child.children && checkSubtree(child.children);
      });
    };

    return node.children && checkSubtree(node.children);
  }, [activeDocumentId, document?.id, getDocumentAsNavigationNode]);

  const shouldExpand = useMemo(() => {
    if (!activeDocumentId) return false;
    return document?.id === activeDocumentId || isInPathToActiveDocument();
  }, [activeDocumentId, document?.id, isInPathToActiveDocument]);

  // Get navigation node and child documents
  const node = useMemo(() => {
    if (!document?.id) return null;
    return getDocumentAsNavigationNode(document.id);
  }, [document?.id, getDocumentAsNavigationNode, allDocuments]);

  const childDocuments = useMemo(() => node?.children || [], [node?.children]);
  const hasChildDocuments = childDocuments.length > 0;

  // Document details are now managed by the document store and updated via websocket events

  // Auto-expand when active or in path to active
  useEffect(() => {
    if (shouldExpand && !isExpanded && !userToggled) {
      setIsExpanded(true);
    }
  }, [shouldExpand, isExpanded, userToggled]);

  /**
   * Load child documents with permission filtering
   * Only loads children that the user has permission to access
   */
  const loadChildDocuments = useRefCallback(async () => {
    const shouldTriggerLoad = document?.id && document.id === activeDocumentId && isExpanded && !childrenLoaded && !isLoadingChildren;
    if (!shouldTriggerLoad) return;

    setIsLoadingChildren(true);
    try {
      await fetchChildren({ parentId: document.id, subspaceId: document.subspaceId || null, sharedDocumentId: sharedDocId, options: { force: true } });
      setChildrenLoaded(true);
    } catch (error) {
      console.warn(`Failed to load children for document ${document.id}:`, error);
    } finally {
      setIsLoadingChildren(false);
    }
  });

  /**
   * Dynamically load child documents when expanded
   * This implements lazy loading for better performance with large document trees
   */
  useEffect(() => {
    // Only load children when the document is active AND expanded (user explicitly opened it)
    // This prevents infinite loops when navigating to a document
    if (isExpanded) {
      loadChildDocuments();
    }
  }, [isExpanded]);

  const handleDisclosureClick = useCallback(
    (ev?: React.MouseEvent<HTMLButtonElement>) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      setIsExpanded(!isExpanded);
      setUserToggled(true);
    },
    [isExpanded, setUserToggled],
  );

  // Check read permission
  // FIXME: add permission check
  // const canRead = hasPermission(document?.id, "read");
  // if (!canRead) return null;

  // const icon = hasChildDocuments ? <FolderIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />;
  const docTitle = document?.title || "Untitled";

  return (
    <div className="share-with-me-link">
      <SidebarLink
        to={`/${document?.id}`}
        // icon={icon}
        label={<span className="text-sm">{docTitle}</span>}
        expanded={hasChildDocuments ? isExpanded : undefined}
        onDisclosureClick={hasChildDocuments ? handleDisclosureClick : undefined}
        depth={depth}
        active={document?.id === activeDocumentId}
      />

      {/* Render child documents with dynamic loading */}
      {isExpanded && (
        <div className="pl-4">
          {isLoadingChildren ? (
            <div className="flex items-center gap-2 h-8 px-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs text-muted-foreground">{t("Loading children...")}</span>
            </div>
          ) : (
            childDocuments.map((childDoc) => {
              // Get the actual document from the store
              const childDocFromStore = useDocumentStore.getState().documents[childDoc.id];
              if (!childDocFromStore) return null;
              return <ShareWithMeLink key={childDoc.id} document={childDocFromStore} depth={depth + 1} rootSharedDocumentId={sharedDocId} />;
            })
          )}
        </div>
      )}
    </div>
  );
}
