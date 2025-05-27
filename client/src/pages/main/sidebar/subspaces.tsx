import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SubspaceTypeSchema } from "contracts";
import useWorkspaceStore from "@/stores/workspace-store";
import useSubSpaceStore from "@/stores/subspace";
import { DraggableSubspaceContainer } from "./components/draggable-subspace-container";
import DropCursor from "./components/drop-cursor";
import { useDroppable } from "@dnd-kit/core";

export default function SubspacesArea() {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore.use.currentWorkspace();
  const fetchList = useSubSpaceStore((state) => state.fetchList);
  const ids = useSubSpaceStore((state) => state.ids);
  const create = useSubSpaceStore((state) => state.create);
  const subspaces = useSubSpaceStore((state) => state.allSubspaces);
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  // drag target for drop to top
  const { isOver: isTopDropOver, setNodeRef: setTopDropRef } = useDroppable({
    id: "subspace-drop-top",
    data: {
      accept: ["subspace"],
      dropType: "top",
    },
  });

  //  drop target for drop to bottom
  const { isOver: isBottomDropOver, setNodeRef: setBottomDropRef } = useDroppable({
    id: "subspace-drop-bottom",
    data: {
      accept: ["subspace"],
      dropType: "bottom",
    },
  });

  useEffect(() => {
    fetchList();
  }, []);

  const handleSubspaceCreate = async () => {
    try {
      setIsCreating(true);
      await create({
        name: "New Subspace" + ids.length + 1,
        description: "New Subspace Description",
        avatar: "",
        type: SubspaceTypeSchema.Enum.PUBLIC,
        workspaceId: currentWorkspace?.id!,
      });
    } catch (error) {
      console.error("Failed to create subspace:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!subspaces) {
    return null;
  }

  return (
    <SidebarGroup>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between group/label">
          <CollapsibleTrigger className="flex items-center gap-1 hover:opacity-70">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            <SidebarGroupLabel>{t("Subspaces")}</SidebarGroupLabel>
          </CollapsibleTrigger>
          <div className="flex items-center gap-1 invisible group-hover/label:visible">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25"
              onClick={handleSubspaceCreate}
              disabled={isCreating}
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CollapsibleContent>
          <div className="relative">
            <div ref={setTopDropRef} className="h-[1px]">
              <DropCursor isActiveDrop={isTopDropOver} innerRef={null} position="top" />
            </div>
            {subspaces.map((subspace) => (
              <DraggableSubspaceContainer key={subspace.id} subspace={subspace} />
            ))}
            <div ref={setBottomDropRef} className="h-[1px]">
              <DropCursor isActiveDrop={isBottomDropOver} innerRef={null} position="bottom" />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
