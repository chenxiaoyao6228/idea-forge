import * as React from "react";
import { useParams } from "react-router-dom";
import { PlusIcon, MoreHorizontal, EditIcon, StarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import useSubSpaceStore, { SubspaceEntity } from "@/stores/subspace";
import useDocumentStore from "@/stores/document";
import useStarStore from "@/stores/star";
import { SidebarLink } from "./sidebar-link";
import { DocumentLink } from "./document-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DraggableDocumentContainer } from "./draggable-document-container";
import { EditableTitle } from "./editable-title";
import { subspaceApi } from "@/apis/subspace";

interface SubspaceLinkProps {
  subspace: SubspaceEntity;
  depth?: number;
  isDragging?: boolean; // subspace being dragged
  isActiveDrop?: boolean; // subspace is the active drop target
}

export function SubspaceLink({ subspace, depth = 0, isDragging = false, isActiveDrop = false }: SubspaceLinkProps) {
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

  const editableTitleRef = React.useRef<{ setIsEditing: (editing: boolean) => void }>(null);

  const star = useSubSpaceStore((state) => state.star);
  const unStar = useSubSpaceStore((state) => state.unStar);
  const isStarred = useStarStore((state) => state.isStarred(undefined, subspaceId));

  // Auto-expand if contains active document
  const shouldExpand = useMemo(() => {
    if (!activeDocumentId || !subspace?.navigationTree) return false;

    const path = getPathToDocument(subspaceId, activeDocumentId);
    return path.length > 0; // 如果路径存在，说明活动文档在此 subspace 中
  }, [activeDocumentId, subspaceId, getPathToDocument, subspace?.navigationTree]);

  useEffect(() => {
    if (shouldExpand) {
      setIsExpanded(true);
    }
  }, [shouldExpand]);

  useEffect(() => {
    fetchNavigationTree(subspaceId);
  }, [fetchNavigationTree, subspaceId]);

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
          title: "New Document" + Math.floor(Math.random() * 1000),
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

  const handleAddMembers = useCallback(() => {
    // TODO: Implement add members functionality
    console.log("Add members to subspace:", subspaceId);
  }, [subspaceId]);

  const handleSubspaceSettings = useCallback(() => {
    // TODO: Implement subspace settings functionality
    console.log("Open subspace settings:", subspaceId);
  }, [subspaceId]);

  const handleLeaveSubspace = useCallback(() => {
    // TODO: Implement leave subspace functionality
    console.log("Leave subspace:", subspaceId);
  }, [subspaceId]);

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

  const handleStar = useCallback(
    async (ev: React.MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();

      try {
        if (isStarred) {
          await unStar({ id: subspaceId, title: subspace.name, type: "subspace" });
        } else {
          await star({ id: subspaceId, title: subspace.name, type: "subspace" });
        }
      } catch (error) {
        console.error("Failed to toggle star:", error);
      }
    },
    [isStarred, subspaceId, subspace.name, star, unStar],
  );

  if (!subspace) {
    return null;
  }

  const hasDocuments = subspace.navigationTree && subspace.navigationTree.length > 0;

  const icon = (
    <Avatar className="h-5 w-5">
      {subspace.avatar ? (
        <AvatarImage src={subspace.avatar} alt={subspace.name} />
      ) : (
        <AvatarFallback className="text-xs">{subspace.name.charAt(0).toUpperCase()}</AvatarFallback>
      )}
    </Avatar>
  );

  const menu = (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleStar} title={isStarred ? "Remove star" : "Add star"}>
        <StarIcon className={`h-3 w-3 ${isStarred ? "text-yellow-500" : ""}`} />
      </Button>
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
          <DropdownMenuItem onClick={handleAddMembers}>{t("Add members")}</DropdownMenuItem>
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
          icon={icon}
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

      {hasDocuments && isExpanded && (
        <div className="ml-4">
          {subspace.navigationTree.map((node, index) => (
            <DraggableDocumentContainer key={node.id} node={node} subspaceId={subspaceId} depth={depth + 1} index={index} />
          ))}
        </div>
      )}
    </>
  );
}
