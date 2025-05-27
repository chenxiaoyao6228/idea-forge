import * as React from "react";
import { useParams } from "react-router-dom";
import { FileIcon, FolderIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigationNode } from "contracts";
import useDocumentStore from "@/stores/document";
import { SidebarLink } from "./sidebar-link";
import useSubSpaceStore from "@/stores/subspace";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

interface DocumentLinkProps {
  node: NavigationNode;
  subspaceId: string;
  depth: number;
  index: number;
  parentId?: string;
}

export function DocumentLink({ node, subspaceId, depth, index, parentId }: DocumentLinkProps) {
  const { docId: activeDocumentId } = useParams();
  const navigate = useNavigate();
  const createDocument = useDocumentStore((state) => state.createDocument);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const isActiveDocument = activeDocumentId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  // auto expand state sync
  const getPathToDocument = useSubSpaceStore((state) => state.getPathToDocument);
  const showChildren = useMemo(() => {
    if (!hasChildren || !activeDocumentId) return false;

    const path = getPathToDocument(subspaceId, activeDocumentId);
    const pathIds = path.map((entry) => entry.id);

    // 检查当前节点是否在活动文档的路径中，或者当前节点就是活动文档
    return pathIds.includes(node.id) || isActiveDocument;
  }, [hasChildren, activeDocumentId, node.id, isActiveDocument, getPathToDocument, subspaceId]);

  // 自动展开状态同步
  useEffect(() => {
    if (showChildren) {
      setIsExpanded(true);
    }
  }, [showChildren]);

  const handleDisclosureClick = useCallback(
    (ev?: React.MouseEvent<HTMLButtonElement>) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      setIsExpanded(!isExpanded);
    },
    [isExpanded],
  );

  const handleCreateChild = useCallback(
    async (ev: React.MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      try {
        setIsCreating(true);
        const newDocId = await createDocument({
          title: "New Document",
          parentId: node.id,
          subspaceId,
        });
        setIsExpanded(true);

        navigate(`/${newDocId}`);
      } catch (error) {
        console.error("Failed to create document:", error);
      } finally {
        setIsCreating(false);
      }
    },
    [createDocument, node.id, subspaceId],
  );

  const icon = hasChildren ? <FolderIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />;

  const menu = (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCreateChild} disabled={isCreating}>
      <PlusIcon className="h-3 w-3" />
    </Button>
  );

  return (
    <>
      <SidebarLink
        to={`/${node.id}`}
        icon={icon}
        label={node.title}
        expanded={hasChildren ? isExpanded : undefined}
        onDisclosureClick={hasChildren ? handleDisclosureClick : undefined}
        depth={depth}
        active={isActiveDocument}
        menu={menu}
        showActions={isActiveDocument}
      />

      {hasChildren && isExpanded && (
        <div>
          {node.children?.map((child, childIndex) => (
            <DocumentLink key={child.id} node={child} subspaceId={subspaceId} depth={depth + 1} index={childIndex} parentId={node.id} />
          ))}
        </div>
      )}
    </>
  );
}
