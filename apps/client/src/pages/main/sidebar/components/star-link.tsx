import * as React from "react";
import { useParams } from "react-router-dom";
import { StarIcon, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { SidebarLink } from "./sidebar-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useStarStore from "@/stores/star";
import useDocumentStore from "@/stores/document";
import useSubSpaceStore from "@/stores/subspace";
import { StarEntity } from "@/stores/star";
import { DocumentLink } from "./document-link";

interface StarLinkProps {
  star: StarEntity;
  isDragging?: boolean;
  isDraggingOverlay?: boolean;
}

export function StarLink({ star, isDragging = false, isDraggingOverlay = false }: StarLinkProps) {
  const { t } = useTranslation();
  const { docId: activeDocumentId } = useParams();
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const document = useDocumentStore((state) => state.entities[star.docId || ""]);
  const subspace = useSubSpaceStore((state) => state.entities[star.subspaceId || ""]);
  const removeStar = useStarStore((state) => state.remove);

  // Auto-expand if contains active document
  const shouldExpand = useMemo(() => {
    if (!activeDocumentId) return false;
    if (star.docId) {
      return document?.id === activeDocumentId;
    }
    if (star.subspaceId) {
      return subspace?.navigationTree?.some((node) => node.id === activeDocumentId);
    }
    return false;
  }, [activeDocumentId, document?.id, star.docId, star.subspaceId, subspace?.navigationTree]);

  useEffect(() => {
    if (shouldExpand) {
      setIsExpanded(true);
    }
  }, [shouldExpand]);

  const handleDisclosureClick = useCallback(
    (ev?: React.MouseEvent<HTMLButtonElement>) => {
      ev?.preventDefault();
      ev?.stopPropagation();
      setIsExpanded(!isExpanded);
    },
    [isExpanded],
  );

  const handleUnStar = useCallback(async () => {
    try {
      await removeStar(star.id);
    } catch (error) {
      console.error("Failed to unStar:", error);
    }
  }, [removeStar, star.id]);

  if (!document && !subspace) {
    return null;
  }

  const hasDocuments = document?.children?.length > 0 || subspace?.navigationTree?.length > 0;
  const title = document?.title || subspace?.name || "";
  const icon = <StarIcon className="h-4 w-4 text-yellow-500" />;

  const menu = (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title={t("More options")}>
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleUnStar} className="text-destructive focus:text-destructive">
            {t("Remove star")}
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
      <SidebarLink
        to={document ? `/${document.id}` : `/${subspace?.id}`}
        icon={icon}
        label={title}
        expanded={hasDocuments ? isExpanded : undefined}
        onDisclosureClick={handleDisclosureClick}
        depth={0}
        menu={menu}
        showActions={isExpanded}
        isActiveDrop={false}
        style={dragStyle}
      />

      {hasDocuments && isExpanded && !isDraggingOverlay && (
        <div className="ml-4">
          {document?.children?.map((node, index) => (
            <DocumentLink key={node.id} node={node} depth={1} index={index} parentId={star.docId || null} subspaceId={document.subspaceId || null} />
          ))}
          {subspace?.navigationTree?.map((node, index) => (
            <DocumentLink key={node.id} node={node} depth={1} index={index} parentId={star.docId || null} subspaceId={subspace.id} />
          ))}
        </div>
      )}
    </>
  );
}
