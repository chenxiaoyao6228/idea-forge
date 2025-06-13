import * as React from "react";
import { useParams } from "react-router-dom";
import { FolderIcon, PlusIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarLink } from "./sidebar-link";
import { DocumentLink } from "./document-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useDocumentStore from "@/stores/document";
import useUIStore from "@/stores/ui";
import { Button } from "@/components/ui/button";
import { DraggableDocumentContainer } from "./draggable-document-container";

export function MyDocsLink() {
  const { docId: activeDocumentId } = useParams();
  const activeDocumentIdFromStore = useUIStore((state) => state.activeDocumentId);
  const currentActiveDocId = activeDocumentId || activeDocumentIdFromStore;

  const { getMyDocsRootDocuments, fetchMyDocsChildren, getPathToDocumentInMyDocs, createMyDocsDocument } = useDocumentStore();

  const rootDocuments = getMyDocsRootDocuments();

  // 初始化时加载根文档
  useEffect(() => {
    fetchMyDocsChildren(null);
  }, [fetchMyDocsChildren]);

  // 直接渲染根文档列表，不需要额外的 SidebarLink 包装
  return (
    <div>
      {rootDocuments.map((node, index) => (
        <DraggableDocumentContainer key={node.id} node={node} subspaceId={""} depth={0} index={index} />
      ))}
    </div>
  );
}
