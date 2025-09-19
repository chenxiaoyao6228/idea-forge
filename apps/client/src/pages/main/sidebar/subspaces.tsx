import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, ChevronRight, Layers } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DraggableSubspaceContainer } from "./components/draggable-subspace-container";
import DropCursor from "./components/drop-cursor";
import { useDroppable } from "@dnd-kit/core";
import useWorkspaceStore from "@/stores/workspace-store";
import useSubSpaceStore, { useJoinedSubspaces, useFetchSubspaces } from "@/stores/subspace-store";
import { AllSubspaceSheet } from "../settings/subspace/all-subspace-sheet";
import { showCreateSubspaceModal } from "../settings/subspace/create-subspace-dialog";
import { useWorkspaceType } from "@/hooks/use-workspace-type";

export default function SubspacesArea() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);

  const { isPersonalWorkspace } = useWorkspaceType();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const joinedSubspaces = useJoinedSubspaces();
  const { run: fetchList } = useFetchSubspaces();
  const isCreating = useSubSpaceStore((state) => state.isCreating);

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

  // Hide subspace area for personal workspaces
  if (isPersonalWorkspace) return null;

  if (!joinedSubspaces) return null;

  return (
    <SidebarGroup>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between group/label">
          <CollapsibleTrigger className="flex items-center gap-1 hover:opacity-70">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            <SidebarGroupLabel>{t("Subspaces")}</SidebarGroupLabel>
          </CollapsibleTrigger>
          <div className="flex items-center gap-1">
            <AllSubspaceSheet>
              <div className="flex items-center gap-1 invisible group-hover/label:visible">
                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25" disabled={isCreating}>
                  <Layers className="h-4 w-4" />
                </Button>
              </div>
            </AllSubspaceSheet>
            <div
              className="ml-1 flex items-center gap-1 invisible group-hover/label:visible"
              onClick={() => showCreateSubspaceModal({ workspaceId: currentWorkspace?.id! })}
            >
              <Button variant="ghost" size="icon" className="h-4 w-4 p-0 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25" disabled={isCreating}>
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
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
