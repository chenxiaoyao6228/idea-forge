import * as React from "react";
import { useParams } from "react-router-dom";
import { StarIcon, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";
import { SidebarLink } from "./sidebar-link";
import { useCallback, useEffect, useMemo, useState } from "react";
import useStarStore from "@/stores/star";
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
  const [isExpanded, setIsExpanded] = useState(false);

  const removeStar = useStarStore((state) => state.remove);
  const getNavigationNodeForStar = useStarStore((state) => state.getNavigationNodeForStar);

  // Get navigation node for this star
  const navigationNode = useMemo(() => {
    return getNavigationNodeForStar(star);
  }, [star, getNavigationNodeForStar]);

  // Auto-expand if contains active document
  const shouldExpand = useMemo(() => {
    if (!activeDocumentId || !navigationNode) return false;

    // Check if the navigation node itself is active
    if (navigationNode.id === activeDocumentId) return true;

    // Check if any child contains the active document
    const checkChildren = (node: any): boolean => {
      if (node.id === activeDocumentId) return true;
      if (node.children) {
        return node.children.some(checkChildren);
      }
      return false;
    };

    return checkChildren(navigationNode);
  }, [activeDocumentId, navigationNode]);

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

  // Don't render if no navigation node found
  if (!navigationNode) {
    return null;
  }

  const hasDocuments = navigationNode.children && navigationNode.children.length > 0;
  const title = navigationNode.title;
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
    <div className="star-link">
      <SidebarLink
        to={navigationNode.url || `/${navigationNode.id}`}
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
          {navigationNode.children?.map((node, index) => (
            <DocumentLink key={node.id} node={node} depth={1} index={index} parentId={star.docId || null} subspaceId={star.subspaceId || null} />
          ))}
        </div>
      )}
    </div>
  );
}
