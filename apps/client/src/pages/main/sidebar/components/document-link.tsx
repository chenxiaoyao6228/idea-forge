import * as React from "react";
import { useParams } from "react-router-dom";
import { EditIcon, FileIcon, FolderIcon, PlusIcon, StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavigationNode } from "@idea/contracts";
import useDocumentStore from "@/stores/document";
import { SidebarLink } from "./sidebar-link";
import useSubSpaceStore, { getPersonalSubspace } from "@/stores/subspace";
import useStarStore from "@/stores/star";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const fetchNavigationTree = useSubSpaceStore((state) => state.fetchNavigationTree);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const isActiveDocument = activeDocumentId === node.id;
  const hasChildren = node.children && node.children.length > 0;

  // Load children details when document is active and has children in navigation tree
  // This ensures that child documents are fetched from the API and the navigation tree is updated
  // Similar to Outline's implementation where children are loaded on expand
  useEffect(() => {
    if (isActiveDocument && hasChildren) {
      const fetchData = async () => {
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
      };

      void fetchData();
    }
  }, [fetchChildren, fetchNavigationTree, node.id, hasChildren, isActiveDocument, subspaceId]);

  // auto expand state sync
  const getPathToDocument = useSubSpaceStore((state) => state.getPathToDocument);
  const pathFinder = props.getPathToDocument || getPathToDocument;

  const showChildren = useMemo(() => {
    if (!hasChildren || !activeDocumentId) return false;

    // Get the subspace entity
    const subspace = subspaceId ? useSubSpaceStore.getState().entities[subspaceId] : undefined;
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

  const isExpandedAndNotDragging = isExpanded && !isDragging;

  return (
    <>
      <SidebarLink
        to={`/${node.id}`}
        icon={icon}
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
        <div>
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
    </>
  );
}
