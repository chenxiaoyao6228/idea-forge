import * as React from "react";
import { useParams } from "react-router-dom";
import { PlusIcon, MoreHorizontal, EditIcon, StarIcon, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useSubSpaceStore, { SubspaceEntity } from "@/stores/subspace";
import useDocumentStore from "@/stores/document";
import useStarStore from "@/stores/star";
import { SidebarLink } from "./sidebar-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DraggableDocumentContainer } from "./draggable-document-container";
import { EditableTitle } from "./editable-title";
import { subspaceApi } from "@/apis/subspace";
import { AddSubspaceMemberDialog } from "../../settings/subspace/add-subspace-member-dialog";
import { useCentralModal } from "@/components/central-modal";

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
  const fetchNavigationTree = useSubSpaceStore((state) => state.fetchNavigationTree);
  const createDocument = useDocumentStore((state) => state.createDocument);
  const getPathToDocument = useSubSpaceStore((state) => state.getPathToDocument);
  const subspaceId = subspace.id;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Only load navigation tree once when first expanded, but the tree can be forced refreshed by websocket
  const [isNavigationTreeFirstLoaded, setIsNavigationTreeFirstLoaded] = useState(false);

  const editableTitleRef = React.useRef<{ setIsEditing: (editing: boolean) => void }>(null);

  const star = useSubSpaceStore((state) => state.star);
  const unStar = useSubSpaceStore((state) => state.unStar);
  const isStarred = useStarStore((state) => state.isStarred(undefined, subspaceId));
  const leaveSubspace = useSubSpaceStore((state) => state.leaveSubspace);

  const settingModal = useCentralModal("setting-modal");

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
        fetchNavigationTree(subspaceId);
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

  const handleCreateDocument = useCallback(
    async (ev: React.MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      try {
        setIsCreating(true);
        const newDocId = await createDocument({
          // FIXME:
          title: "Doc" + Math.floor(Math.random() * 1000),
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
    },
    [createDocument, subspaceId],
  );

  const handleSubspaceSettings = useCallback(() => {
    settingModal.show({ tab: "subspace", subspaceId });
  }, [settingModal, subspaceId]);

  const handleLeaveSubspace = useCallback(async () => {
    try {
      const result = await leaveSubspace(subspaceId);

      if (result.success) {
        toast.success(t("Successfully left subspace"));
      } else if (result.error) {
        // Handle specific error codes
        switch (result.error.code) {
          case "cannot_leave_as_last_admin":
            toast.error(t("Cannot leave subspace as the last admin. Please assign another admin first."));
            break;
          case "not_member":
            toast.error(t("You are not a member of this subspace"));
            break;
          case "permission_denied":
            toast.error(t("You don't have permission to leave this subspace"));
            break;
          default:
            toast.error(result.error.message || t("Failed to leave subspace"));
        }
      }
    } catch (error) {
      // Fallback error handling
      console.error("Unexpected error leaving subspace:", error);
      toast.error(t("An unexpected error occurred"));
    }
  }, [subspaceId, leaveSubspace, t]);

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

  const menu = (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCreateDocument} disabled={isCreating} title={t("Create new document")}>
        <PlusIcon className="h-3 w-3" />
      </Button>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleRename} disabled={isEditing} title={t("Rename subspace")}>
        <EditIcon className="h-3 w-3" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title={t("More options")}>
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <AddSubspaceMemberDialog subspaceId={subspaceId} subspaceName={subspace.name} workspaceId={subspace.workspaceId} onSuccess={() => {}}>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>{t("Add members")}</DropdownMenuItem>
          </AddSubspaceMemberDialog>
          <DropdownMenuItem onClick={handleSubspaceSettings}>{t("Subspace settings")}</DropdownMenuItem>
          <DropdownMenuItem onClick={handleLeaveSubspace} className="text-destructive focus:text-destructive">
            {t("Leave subspace")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
              canUpdate={true}
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
