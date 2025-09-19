import * as React from "react";
import { useParams } from "react-router-dom";
import { PlusIcon, EditIcon, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import useSubSpaceStore, { SubspaceEntity, useFetchNavigationTree, useGetPathToDocument } from "@/stores/subspace-store";
import useDocumentStore, { useCreateDocument } from "@/stores/document-store";
import { SidebarLink } from "./sidebar-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DraggableDocumentContainer } from "./draggable-document-container";
import { EditableTitle } from "./editable-title";
import { subspaceApi } from "@/apis/subspace";
import { useRefCallback } from "@/hooks/use-ref-callback";
import { SubspaceMenu } from "../../settings/subspace/subspace-menu";

interface SubspaceLinkProps {
  subspace: SubspaceEntity;
  depth?: number;
  isDragging?: boolean; // subspace being dragged
  isActiveDrop?: boolean; // subspace is the active drop target
  isDraggingOverlay?: boolean; // is dragging overlay
}

export function SubspaceLink({ subspace, depth = 0, isDragging = false, isActiveDrop = false, isDraggingOverlay = false }: SubspaceLinkProps) {
  const { t } = useTranslation();
  const { docId: activeDocumentId } = useParams();
  const navigate = useNavigate();
  const { run: fetchNavigationTree } = useFetchNavigationTree();
  const { run: createDocument } = useCreateDocument();
  const getPathToDocument = useGetPathToDocument();
  const subspaceId = subspace.id;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Only load navigation tree once when first expanded, but the tree can be forced refreshed by websocket
  const [isNavigationTreeFirstLoaded, setIsNavigationTreeFirstLoaded] = useState(false);

  const editableTitleRef = React.useRef<{ setIsEditing: (editing: boolean) => void }>(null);

  // Auto-expand if contains active document
  const shouldExpand = useMemo(() => {
    if (!activeDocumentId || !subspace?.navigationTree) return false;

    const path = getPathToDocument(subspaceId, activeDocumentId);
    return path.length > 0; // if path exists, the active document is in this subspace
  }, [activeDocumentId, subspaceId, getPathToDocument, subspace?.navigationTree]);

  useEffect(() => {
    if (shouldExpand) {
      setIsExpanded(true);
    }
  }, [shouldExpand]);

  useEffect(() => {
    if (isExpanded) {
      if (!isNavigationTreeFirstLoaded) {
        fetchNavigationTree({ subspaceId });
        setIsNavigationTreeFirstLoaded(true);
      }
    }
  }, [fetchNavigationTree, subspaceId, isExpanded]);

  const handleDisclosureClick = useCallback(
    (ev?: React.MouseEvent<HTMLButtonElement>) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      setIsExpanded(!isExpanded);
    },
    [isExpanded],
  );

  const handleCreateDocument = useRefCallback(async (ev: React.MouseEvent) => {
    ev.preventDefault();
    ev.stopPropagation();

    try {
      setIsCreating(true);
      const newDocId = await createDocument({
        title: t("Untitled"),
        parentId: null,
        subspaceId,
      });

      setIsExpanded(true);

      navigate(`/${newDocId}`);
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setIsCreating(false);
    }
  });

  const handleTitleChange = useCallback(
    async (value: string) => {
      try {
        await subspaceApi.updateSubspace(subspaceId, { name: value });
      } catch (error) {
        console.error("Failed to update subspace name:", error);
      }
    },
    [subspaceId],
  );

  const handleRename = useCallback(() => {
    editableTitleRef.current?.setIsEditing(true);
  }, []);

  if (!subspace) {
    return null;
  }

  const hasDocuments = subspace.navigationTree && subspace.navigationTree.length > 0;

  const menu = useMemo(
    () => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCreateDocument} disabled={isCreating} title={t("Create new document")}>
          <PlusIcon className="h-3 w-3" />
        </Button>
        {/* Update: change the subspace name on the setting */}
        {/* <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRename} disabled={isEditing} title={t("Rename subspace")}>
          <EditIcon className="h-3 w-3" />
        </Button> */}

        <SubspaceMenu subspaceId={subspace.id} subspaceName={subspace.name} subspaceType={subspace.type} workspaceId={subspace.workspaceId} />
      </div>
    ),
    [handleCreateDocument, handleRename, subspaceId, subspace.name, subspace.workspaceId, subspace.type],
  );

  const dragStyle = {
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <>
      <div className="subspace-link">
        <SidebarLink
          to={""}
          icon={<Layers className="h-4 w-4" />}
          label={
            <EditableTitle
              title={subspace.name}
              onSubmit={handleTitleChange}
              isEditing={isEditing}
              onEditing={setIsEditing}
              editable={false}
              maxLength={255}
              ref={editableTitleRef}
            />
          }
          expanded={hasDocuments ? isExpanded : undefined}
          onDisclosureClick={hasDocuments ? handleDisclosureClick : undefined}
          depth={depth}
          menu={menu}
          showActions={isExpanded}
          isActiveDrop={isActiveDrop}
          style={dragStyle}
        />
      </div>

      {hasDocuments && isExpanded && !isDraggingOverlay && (
        <div className="ml-4">
          {subspace.navigationTree.map((node, index) => (
            <DraggableDocumentContainer key={node.id} node={node} parentId={null} subspaceId={subspaceId} depth={depth + 1} index={index} />
          ))}
        </div>
      )}
    </>
  );
}
