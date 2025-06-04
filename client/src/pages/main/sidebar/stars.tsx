import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useDroppable } from "@dnd-kit/core";
import DropCursor from "./components/drop-cursor";
import { StarLink } from "./components/star-link";
import useStarStore, { starEntitySelectors } from "@/stores/star";
import { useDragAndDropContext } from "./hooks/use-dnd";

export default function StarsArea() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const { fetchList, orderedStars } = useStarStore();
  const stars = useStarStore(starEntitySelectors.selectAll);
  console.log(stars, "stars");
  const { activeId } = useDragAndDropContext();

  // drag target for drop to top
  const { isOver: isTopDropOver, setNodeRef: setTopDropRef } = useDroppable({
    id: "star-drop-top",
    data: {
      accept: ["star"],
      dropType: "top",
    },
  });

  useEffect(() => {
    fetchList();
  }, []);

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
          <div className="relative">
            <div ref={setTopDropRef} className="h-[1px]">
              <DropCursor isActiveDrop={isTopDropOver} innerRef={null} position="top" />
            </div>
            {orderedStars.map((star) => (
              <StarLink key={star.id} star={star} isDragging={activeId === star.id} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
