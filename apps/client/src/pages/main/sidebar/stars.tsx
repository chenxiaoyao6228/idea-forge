import { SidebarGroup, SidebarGroupLabel } from '@idea/ui/shadcn/ui/sidebar';
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@idea/ui/shadcn/ui/collapsible';
import { useOrderedStars, useFetchStars } from "@/stores/star-store";
import { useFetchSubspaces } from "@/stores/subspace-store";
import useWorkspaceStore from "@/stores/workspace-store";
import { useDragAndDropContext } from "./hooks/use-dnd";
import { DraggableStarContainer } from "./components/draggable-star-container";

export default function StarsArea() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const orderedStars = useOrderedStars();
  const fetchStars = useFetchStars();
  const { run: fetchSubspaces } = useFetchSubspaces();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const { activeId } = useDragAndDropContext();

  useEffect(() => {
    fetchStars.run();
    // Ensure subspaces are loaded so star navigation can work
    if (currentWorkspace?.id) {
      fetchSubspaces(currentWorkspace.id);
    }
  }, [currentWorkspace?.id]); // Run when workspace changes

  if (!orderedStars.length) return null;

  return (
    <SidebarGroup>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between group/label">
          <CollapsibleTrigger className="flex items-center gap-1 hover:opacity-70">
            <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
            <SidebarGroupLabel>{t("Quick access")}</SidebarGroupLabel>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          {orderedStars.map((star, index) => (
            <DraggableStarContainer key={star.id} index={index} star={star} isDragging={activeId === star.id} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
