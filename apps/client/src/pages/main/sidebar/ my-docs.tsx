import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import useDocumentStore, { useCreateDocument } from "@/stores/document-store";
import DropCursor from "./components/drop-cursor";
import { useDroppable } from "@dnd-kit/core";
import useSubSpaceStore, { usePersonalSubspace } from "@/stores/subspace-store";
import { DraggableDocumentContainer } from "./components/draggable-document-container";
import { useIsGuestCollaborator } from "@/stores/guest-collaborators-store";
import { showConfirmModal } from "@/components/ui/confirm-modal";
import { useNavigate } from "react-router-dom";

export default function MyDocsArea() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { run: createMyDocsDocument } = useCreateDocument();
  const personalSubspace = usePersonalSubspace();
  const isGuestCollaborator = useIsGuestCollaborator();
  const navigationTree = personalSubspace?.navigationTree || [];
  const navigate = useNavigate();

  const handleCreateDocument = async () => {
    if (isGuestCollaborator) {
      const result = await showConfirmModal({
        title: t('Private pages are only open to "space members"'),
        description: t("If you need to use it, you can contact the administrator to upgrade you to a space member or open your own space."),
        confirmText: t("Create Space"),
        cancelVariant: "default",
        onConfirm: () => {
          navigate("/create-workspace");
          return true;
        },
      });
      return;
    }

    setIsCreating(true);
    try {
      await createMyDocsDocument({
        title: "Doc" + Math.random().toString().substring(2, 5),
        parentId: null,
        subspaceId: personalSubspace?.id || null,
      });
    } catch (error) {
      console.error("Failed to create document:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const { isOver: isTopDropOver, setNodeRef: setTopDropRef } = useDroppable({
    id: "mydocs-drop-top",
    data: {
      accept: ["document"],
      dropType: "top",
      subspaceId: personalSubspace?.id,
      parentId: null,
    },
  });

  // if (!personalSubspace) {
  //   throw new Error("Personal subspace not found");
  // }

  return (
    <SidebarGroup>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between group/label">
          <CollapsibleTrigger className="flex items-center gap-1 hover:opacity-70">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            <SidebarGroupLabel>{t("My Docs")}</SidebarGroupLabel>
          </CollapsibleTrigger>
          <div className="flex items-center gap-1 invisible group-hover/label:visible">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25"
              onClick={handleCreateDocument}
              disabled={isCreating}
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          <div className="relative pl-2">
            <div ref={setTopDropRef} className="h-[1px]">
              <DropCursor isActiveDrop={isTopDropOver} innerRef={null} position="top" />
            </div>
            {navigationTree.map((node, index) => (
              <DraggableDocumentContainer
                key={node.id}
                node={node}
                parentId={node.parentId ?? null}
                subspaceId={node.subspaceId ?? null}
                depth={0}
                index={index}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
