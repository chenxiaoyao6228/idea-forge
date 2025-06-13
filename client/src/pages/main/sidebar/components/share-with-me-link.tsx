import * as React from "react";
import { FileText, Folder } from "lucide-react";
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
}

export function ShareWithMeLink({ document: initialDocument, depth = 0 }: ShareWithMeLinkProps) {
  const { t } = useTranslation();
  const activeDocumentId = useUIStore((state) => state.activeDocumentId);
  const { fetchDetail, fetchChildren, getDocumentAsNavigationNode } = useDocumentStore();
  const { hasPermission } = usePermissionStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [document, setDocument] = useState<DocumentEntity>(initialDocument);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

  // Auto-expand if contains active document
  const shouldExpand = useMemo(() => {
    if (!activeDocumentId) return false;
    return document?.id === activeDocumentId;
  }, [activeDocumentId, document?.id]);

  // Get navigation node and child documents
  const node = useMemo(() => {
    if (!document?.id) return null;
    return getDocumentAsNavigationNode(document.id);
  }, [document?.id, getDocumentAsNavigationNode]);

  const childDocuments = useMemo(() => node?.children || [], [node?.children]);
  const hasChildDocuments = childDocuments.length > 0;
  const isFolder = document?.type === "folder";

  // Fetch document if not provided initially
  useEffect(() => {
    if (document?.id && !document?.title) {
      // Only fetch if we have an ID but no details
      fetchDetail(document.id).then((result) => {
        if (result?.data?.document) {
          setDocument(result.data.document);
        }
      });
    }
  }, [document?.id, fetchDetail]); // Add proper dependencies

  // Auto-expand when active
  useEffect(() => {
    if (shouldExpand) {
      setIsExpanded(true);
    }
  }, [shouldExpand]);

  // Fetch child documents when expanded
  useEffect(() => {
    if (isExpanded && document?.id) {
      setIsLoadingChildren(true);
      fetchChildren(document.id).finally(() => {
        setIsLoadingChildren(false);
      });
    }
  }, [isExpanded, document?.id, fetchChildren]);

  const handleDisclosureClick = useCallback(
    (ev?: React.MouseEvent<HTMLButtonElement>) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      setIsExpanded(!isExpanded);
    },
    [isExpanded],
  );

  const canRead = hasPermission(document?.id, "read");
  if (!canRead) return null;

  const icon = isFolder ? <Folder className="h-4 w-4" /> : <FileText className="h-4 w-4" />;
  const docTitle = document?.title || "Untitled";

  return (
    <>
      <SidebarLink
        to={`/doc/${document?.id}`}
        icon={icon}
        label={<span className="text-sm font-medium">{docTitle}</span>}
        expanded={hasChildDocuments ? isExpanded : undefined}
        onDisclosureClick={handleDisclosureClick}
        depth={depth}
        active={document?.id === activeDocumentId}
      />
      {/* {isExpanded && document && (
        <div className="pl-4">
          {isLoadingChildren ? (
            <div className="h-8 w-full animate-pulse bg-muted rounded" />
          ) : (
            childDocuments.map((childDoc) => <ShareWithMeLink key={childDoc.id} document={childDoc.document} depth={depth + 1} />)
          )}
        </div>
      )} */}
    </>
  );
}
