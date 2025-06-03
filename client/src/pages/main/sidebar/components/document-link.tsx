import * as React from "react";
import { useParams } from "react-router-dom";
import { EditIcon, FileIcon, FolderIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigationNode } from "contracts";
import useDocumentStore from "@/stores/document";
import { SidebarLink } from "./sidebar-link";
import useSubSpaceStore from "@/stores/subspace";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DraggableDocumentContainer } from "./draggable-document-container";
import { EditableTitle } from "./editable-title";
import { documentApi } from "@/apis/document";

export interface DocumentLinkProps {
  node: NavigationNode;
  subspaceId: string;
  depth: number;
  index: number;
  parentId?: string;
  isDragging?: boolean; // item being dragged
  isActiveDrop?: boolean; // item is the active drop target
}

export function DocumentLink({ node, subspaceId, depth, index, parentId }: DocumentLinkProps) {
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
  const showChildren = useMemo(() => {
    if (!hasChildren || !activeDocumentId) return false;

    const path = getPathToDocument(subspaceId, activeDocumentId);
    const pathIds = path.map((entry) => entry.id);

    // check if current node is in the path of the active document, or current node is the active document
    return pathIds.includes(node.id) || isActiveDocument;
  }, [hasChildren, activeDocumentId, node.id, isActiveDocument, getPathToDocument, subspaceId]);

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

  const icon = hasChildren ? <FolderIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />;

  const menu = (
    <>
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
            <DraggableDocumentContainer key={child.id} node={child} subspaceId={subspaceId} depth={depth + 1} index={childIndex} parentId={node.id} />
          ))}
        </div>
      )}
    </>
  );
}
