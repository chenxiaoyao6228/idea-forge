import * as React from "react";
import { useParams } from "react-router-dom";
import { EditIcon, FileIcon, FolderIcon, PlusIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigationNode } from "@idea/contracts";
import useDocumentStore from "@/stores/document";
import { SidebarLink } from "./sidebar-link";
import useSubSpaceStore from "@/stores/subspace";
import useStarStore from "@/stores/star";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DraggableDocumentContainer } from "./draggable-document-container";
import { EditableTitle } from "./editable-title";
import { documentApi } from "@/apis/document";

export interface DocumentLinkProps {
  node: NavigationNode;
  depth: number;
  index: number;
  activeDocumentId?: string;
  subspaceId: string | null;
  parentId: string | null;
  isDragging?: boolean; // item being dragged
  isActiveDrop?: boolean; // item is the active drop target
  getPathToDocument?: (documentId: string, subspaceId: string | null) => NavigationNode[];
}

export function DocumentLink(props: DocumentLinkProps) {
  const { node, subspaceId, depth, index, parentId } = props;
  const { docId: activeDocumentId } = useParams();
  const navigate = useNavigate();

  const createDocument = useDocumentStore((state) => state.createDocument);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isActiveDocument = activeDocumentId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  // auto expand state sync
  const getPathToDocument = useSubSpaceStore((state) => state.getPathToDocument);
  const pathFinder = props.getPathToDocument || getPathToDocument;

  const showChildren = useMemo(() => {
    if (!hasChildren || !activeDocumentId) return false;

    // 如果是 mydocs（没有 subspaceId），使用传入的路径查找函数
    if (!subspaceId && props.getPathToDocument) {
      const path = props.getPathToDocument(activeDocumentId, subspaceId);
      const pathIds = path.map((entry) => entry.id);
      return pathIds.includes(node.id) || isActiveDocument;
    }
    if (subspaceId && props.getPathToDocument) {
      // 否则使用原有的 subspace 路径查找逻辑
      const path = pathFinder(subspaceId, activeDocumentId);
      const pathIds = path.map((entry) => entry.id);
      return pathIds.includes(node.id) || isActiveDocument;
    }
  }, [hasChildren, activeDocumentId, node.id, isActiveDocument, pathFinder, subspaceId, props.getPathToDocument]);

  // auto expand state sync
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
          // FIXME: remove the random number
          title: "New Document" + Math.floor(Math.random() * 1000),
          parentId: node.id,
          subspaceId: subspaceId || null,
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

  const editableTitleRef = React.useRef<{ setIsEditing: (editing: boolean) => void }>(null);
  const handleTitleChange = useCallback(
    async (value: string) => {
      try {
        await documentApi.update(node.id, { title: value });
      } catch (error) {
        console.error("Failed to update document title:", error);
      }
    },
    [node.id],
  );

  const handleRename = useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);

  const star = useDocumentStore((state) => state.star);
  const unStar = useDocumentStore((state) => state.unStar);
  const isStarred = useStarStore((state) => state.isStarred(node.id));

  const handleStar = useCallback(
    async (ev: React.MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      try {
        if (isStarred) {
          await unStar(node.id);
        } else {
          await star(node.id);
        }
      } catch (error) {
        console.error("Failed to toggle star:", error);
      }
    },
    [isStarred, node.id, node.title, star, unStar],
  );

  const icon = hasChildren ? <FolderIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />;

  const menu = (
    <>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleStar} title={isStarred ? "Remove star" : "Add star"}>
        <StarIcon className={`h-3 w-3 ${isStarred ? "text-yellow-500" : ""}`} />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCreateChild} disabled={isCreating}>
        <PlusIcon className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRename} disabled={isEditing}>
        <EditIcon className="h-3 w-3" />
      </Button>
      {/* TODO:  more operations  */}
    </>
  );

  return (
    <>
      <SidebarLink
        to={`/${node.id}`}
        icon={icon}
        expanded={hasChildren ? isExpanded : undefined}
        onDisclosureClick={hasChildren ? handleDisclosureClick : undefined}
        depth={depth}
        active={isActiveDocument}
        menu={menu}
        showActions={isActiveDocument}
        label={
          <EditableTitle
            title={node.title}
            onSubmit={handleTitleChange}
            isEditing={isEditing}
            onEditing={setIsEditing}
            canUpdate={true} // Add proper permission check here
            maxLength={255}
            ref={editableTitleRef}
          />
        }
      />

      {hasChildren && isExpanded && (
        <div>
          {node.children?.map((child, childIndex) => (
            <DraggableDocumentContainer key={child.id} node={child} subspaceId={subspaceId || null} depth={depth + 1} index={childIndex} parentId={node.id} />
          ))}
        </div>
      )}
    </>
  );
}
