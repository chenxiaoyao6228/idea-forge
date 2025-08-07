import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DraggableSubspaceContainer } from "./components/draggable-subspace-container";
import DropCursor from "./components/drop-cursor";
import { useDroppable } from "@dnd-kit/core";
import { useSubspaceOperations } from "@/hooks/use-subspace-operations";
import useWorkspaceStore from "@/stores/workspace";
import useSubSpaceStore from "@/stores/subspace";

export default function SubspacesArea() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  const { isCreating, handleSubspaceCreate, fetchList } = useSubspaceOperations();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const joinedSubspaces = useSubSpaceStore((state) => state.joinedSubspaces);

  // drag target for drop to top
  const { isOver: isTopDropOver, setNodeRef: setTopDropRef } = useDroppable({
    id: "subspace-drop-top",
    data: {
      accept: ["subspace"],
      dropType: "top",
    },
  });

  useEffect(() => {
    if (currentWorkspace) {
      fetchList(currentWorkspace.id);
    }
  }, [fetchList, currentWorkspace]);

  if (!joinedSubspaces) return null;

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
            {joinedSubspaces.map((subspace) => (
              <DraggableSubspaceContainer key={subspace.id} subspace={subspace} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
