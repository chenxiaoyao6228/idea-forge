import * as React from "react";
import { FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SidebarLink } from "./sidebar-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useUIStore from "@/stores/ui";
import useDocumentStore from "@/stores/document";
import { UserPermissionResponse, NavigationNode, NavigationNodeType } from "contracts";
import { DocumentLink } from "./document-link";
import type { DocumentEntity } from "@/stores/document";

interface ShareWithMeLinkProps {
  permission: UserPermissionResponse;
  document?: DocumentEntity;
  depth?: number;
}

export function ShareWithMeLink({ permission, document: initialDocument, depth = 0 }: ShareWithMeLinkProps) {
  const { t } = useTranslation();
  const activeDocumentId = useUIStore((state) => state.activeDocumentId);
  const { fetchDetail, fetchChildren, getDocumentAsNavigationNode } = useDocumentStore();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [document, setDocument] = useState<DocumentEntity | undefined>(initialDocument);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);

  // Auto-expand if contains active document
  const shouldExpand = useMemo(() => {
    if (!activeDocumentId) return false;
    return permission.documentId === activeDocumentId;
  }, [activeDocumentId, permission.documentId]);

  // Get navigation node and child documents
  const node = useMemo(() => {
    if (!document?.id) return null;
    return getDocumentAsNavigationNode(document.id);
  }, [document?.id, getDocumentAsNavigationNode]);

  const childDocuments = useMemo(() => node?.children || [], [node?.children]);
  const hasChildDocuments = childDocuments.length > 0;

  // Fetch document if not provided initially
  useEffect(() => {
    if (!document && permission.documentId) {
      fetchDetail(permission.documentId).then((result) => {
        if (result?.data?.document) {
          setDocument(result.data.document);
        }
      });
    }
  }, [document, permission.documentId, fetchDetail]);

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

  const icon = <FileText className="h-4 w-4" />;
  const docTitle = document?.title || permission.document?.title || "Untitled";

  return (
    <>
      <SidebarLink
        to={`/${permission.documentId}`}
        icon={icon}
        label={
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">{docTitle}</span>
            {/* <span className="text-xs text-muted-foreground">
              {permission.user.displayName || permission.user.email} · {t("Permission")}: {permission.permission}
            </span> */}
          </div>
        }
        expanded={hasChildDocuments ? isExpanded : undefined}
        onDisclosureClick={handleDisclosureClick}
        depth={depth}
        active={permission.documentId === activeDocumentId}
      />
      {isExpanded && document && (
        <div className="pl-4">
          {isLoadingChildren ? (
            <div className="h-8 w-full animate-pulse bg-muted rounded" />
          ) : (
            childDocuments.map((childDoc, index) => (
              <DocumentLink key={childDoc.id} node={childDoc} depth={depth + 1} index={index} subspaceId={document.workspaceId || ""} />
            ))
          )}
        </div>
      )}
    </>
  );
}
