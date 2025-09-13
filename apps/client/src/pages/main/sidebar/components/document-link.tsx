import * as React from "react";
import { useParams } from "react-router-dom";
import { EditIcon, PlusIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigationNode } from "@idea/contracts";
import useDocumentStore from "@/stores/document";
import { SidebarLink } from "./sidebar-link";
import useSubSpaceStore, { getPersonalSubspace } from "@/stores/subspace";
import { useStars } from "@/stores/star-store";
import { useEffect, useMemo, useState } from "react";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { useNavigate } from "react-router-dom";
import { EditableTitle } from "./editable-title";
import { documentApi } from "@/apis/document";
import { DraggableDocumentContainer } from "./draggable-document-container";

export interface DocumentLinkProps {
  node: NavigationNode;
  depth: number; // for ui space indent
  index: number;
  activeDocumentId?: string;
  subspaceId: string | null;
  parentId: string | null;
  isDragging?: boolean; // item being dragged
  isActiveDrop?: boolean; // item is the active drop target
  getPathToDocument?: (documentId: string, subspaceId: string | null) => NavigationNode[];
}

export function DocumentLink(props: DocumentLinkProps) {
  const { node, subspaceId, depth, index, parentId, isDragging, isActiveDrop } = props;
  const { docId: activeDocumentId } = useParams();
  const navigate = useNavigate();

  const createDocument = useDocumentStore((state) => state.createDocument);
  const fetchChildren = useDocumentStore((state) => state.fetchChildren);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isActiveDocument = activeDocumentId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const { checkStarred, toggleStar, isToggling } = useStars();

  // Load children details when document is active and has children in navigation tree
  const fetchChildrenData = useRefCallback(async () => {
    if (!isActiveDocument) return;

    try {
      // Check if children are already loaded to avoid unnecessary API calls
      const existingDocs = useDocumentStore.getState().entities;
      const hasLoadedChildren = Object.values(existingDocs).some((doc) => doc.parentId === node.id);

      if (!hasLoadedChildren) {
        // Fetch children documents
        await fetchChildren({ parentId: node.id, subspaceId: subspaceId || null });
      }
    } catch (error) {
      console.error("Failed to fetch children or refresh navigation tree:", error);
    }
  });

  useEffect(() => {
    void fetchChildrenData();
  }, [isActiveDocument, fetchChildrenData]);

  // auto expand state sync
  const subspace = useSubSpaceStore((state) => (subspaceId ? state.entities[subspaceId] : undefined));

  const showChildren = useMemo(() => {
    if (!hasChildren || !activeDocumentId) return false;

    const isPersonal = subspace?.type === "PERSONAL";

    if (isPersonal && props.getPathToDocument) {
      // For my-docs (PERSONAL subspace), use the my-docs path finder
      const path = props.getPathToDocument(activeDocumentId, null);
      const pathIds = path.map((entry) => entry.id);
      return pathIds.includes(node.id) || isActiveDocument;
    }
    if (!isPersonal && props.getPathToDocument && subspaceId) {
      // For other subspaces, use the subspace path finder
      const path = props.getPathToDocument(subspaceId, activeDocumentId);
      const pathIds = path.map((entry) => entry.id);
      return pathIds.includes(node.id) || isActiveDocument;
    }
    return isActiveDocument;
  }, [hasChildren, activeDocumentId, node.id, isActiveDocument, subspace?.type, subspaceId, props.getPathToDocument]);

  // auto expand state sync
  useEffect(() => {
    if (showChildren) {
      setIsExpanded(true);
    }
  }, [showChildren]);

  const handleDisclosureClick = useRefCallback((ev?: React.MouseEvent<HTMLButtonElement>) => {
    ev?.preventDefault();
    ev?.stopPropagation();
    setIsExpanded(!isExpanded);
  });

  const handleCreateChild = useRefCallback(async (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();

    try {
      setIsCreating(true);
      const newDocId = await createDocument({
        // FIXME: remove the random number
        title: "New Doc-" + Math.floor(Math.random() * 1000),
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
  });

  const editableTitleRef = React.useRef<{ setIsEditing: (editing: boolean) => void }>(null);
  const handleTitleChange = useRefCallback(async (value: string) => {
    try {
      await documentApi.update(node.id, { title: value });
    } catch (error) {
      console.error("Failed to update document title:", error);
      // TODO: Show user-friendly error message and potentially revert the title
      // Consider using a toast notification or inline error state
    }
  });

  const handleRename = useRefCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  });

  // ✅ Simple star handler using action hook
  const handleStar = useRefCallback(async (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    await toggleStar(node.id);
  });

  const isDocStarred = checkStarred(node.id);

  const menu = useMemo(
    () => (
      <>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleStar} disabled={isToggling} title={isDocStarred ? "Remove star" : "Add star"}>
          <StarIcon className={`h-3 w-3 ${isDocStarred ? "text-yellow-500" : ""}`} />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCreateChild} disabled={isCreating}>
          <PlusIcon className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRename} disabled={isEditing}>
          <EditIcon className="h-3 w-3" />
        </Button>
        {/* TODO:  more operations  */}
      </>
    ),
    [handleStar, handleCreateChild, handleRename, isToggling, isCreating, isEditing, isDocStarred],
  );

  const isExpandedAndNotDragging = isExpanded && !isDragging;

  return (
    <div className="document-link">
      <SidebarLink
        to={`/${node.id}`}
        expanded={hasChildren ? isExpandedAndNotDragging : undefined}
        onDisclosureClick={hasChildren ? handleDisclosureClick : undefined}
        depth={depth}
        active={isActiveDocument}
        menu={menu}
        showActions={isActiveDocument}
        isActiveDrop={isActiveDrop}
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
      {/* Children */}
      {hasChildren && isExpandedAndNotDragging && (
        <div className="pl-4">
          {node.children?.map((child, childIndex) => (
            <DraggableDocumentContainer
              key={child.id}
              node={child}
              subspaceId={subspaceId}
              depth={depth + 1}
              index={childIndex}
              parentId={node.id}
              getPathToDocument={props.getPathToDocument}
            />
          ))}
        </div>
      )}
    </div>
  );
}
