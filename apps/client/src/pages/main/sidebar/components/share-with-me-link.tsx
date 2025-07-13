import * as React from "react";
import { FileText, Folder, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarLink } from "./sidebar-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useUIStore from "@/stores/ui";
import useDocumentStore from "@/stores/document";
import usePermissionStore from "@/stores/permission";
import { DocumentLink } from "./document-link";
import type { DocumentEntity } from "@/stores/document";

interface ShareWithMeLinkProps {
  document: DocumentEntity;
  depth?: number;
  loadingParents?: Set<string>;
}

export function ShareWithMeLink({ document: initialDocument, depth = 0, loadingParents = new Set() }: ShareWithMeLinkProps) {
  const { t } = useTranslation();
  const activeDocumentId = useUIStore((state) => state.activeDocumentId);
  const { fetchDetail, fetchChildren, getDocumentAsNavigationNode } = useDocumentStore();
  const { hasPermission } = usePermissionStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [document, setDocument] = useState<DocumentEntity>(initialDocument);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [childrenLoaded, setChildrenLoaded] = useState(false);

  // Check if this document is currently being loaded as a parent
  const isLoadingAsParent = loadingParents.has(document.id);

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
  }, [document?.id, getDocumentAsNavigationNode]);

  const childDocuments = useMemo(() => node?.children || [], [node?.children]);
  const hasChildDocuments = childDocuments.length > 0;
  const isFolder = document?.type === "folder";

  // Load document details if not fully loaded
  useEffect(() => {
    if (document?.id && !document?.title) {
      fetchDetail(document.id).then((result) => {
        if (result?.data?.document) {
          setDocument(result.data.document);
        }
      });
    }
  }, [document?.id, fetchDetail]);

  // Auto-expand when active or in path to active
  useEffect(() => {
    if (shouldExpand && !isExpanded) {
      setIsExpanded(true);
    }
  }, [shouldExpand, isExpanded]);

  /**
   * Load child documents with permission filtering
   * Only loads children that the user has permission to access
   */
  const loadChildDocuments = useCallback(async () => {
    if (!document?.id) return;

    setIsLoadingChildren(true);
    try {
      await fetchChildren({ parentId: document.id, subspaceId: document.subspaceId || null });
      setChildrenLoaded(true);
    } catch (error) {
      console.warn(`Failed to load children for document ${document.id}:`, error);
    } finally {
      setIsLoadingChildren(false);
    }
  }, [document?.id, fetchChildren]);

  /**
   * Dynamically load child documents when expanded
   * This implements lazy loading for better performance with large document trees
   */
  useEffect(() => {
    if (isExpanded && document?.id && !childrenLoaded && !isLoadingChildren) {
      loadChildDocuments();
    }
  }, [isExpanded, document?.id, childrenLoaded, isLoadingChildren, loadChildDocuments]);

  const handleDisclosureClick = useCallback(
    (ev?: React.MouseEvent<HTMLButtonElement>) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      setIsExpanded(!isExpanded);
    },
    [isExpanded],
  );

  // Check read permission
  const canRead = hasPermission(document?.id, "read");
  if (!canRead) return null;

  const icon = isFolder ? <Folder className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
  const docTitle = document?.title || "Untitled";

  // Show loading indicator for parent loading
  const loadingIcon = isLoadingAsParent ? <Loader2 className="h-4 w-4 animate-spin" /> : icon;

  return (
    <>
      <SidebarLink
        to={`/doc/${document?.id}`}
        icon={loadingIcon}
        label={
          <span className="text-sm font-medium">
            {docTitle}
            {isLoadingAsParent && <span className="text-xs text-muted-foreground ml-1">({t("Loading parent...")})</span>}
          </span>
        }
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
            childDocuments.map((childDoc, index) => (
              <DocumentLink key={childDoc.id} node={childDoc} depth={depth + 1} index={index} parentId={document.id} subspaceId={null} />
            ))
          )}
        </div>
      )}
    </>
  );
}
