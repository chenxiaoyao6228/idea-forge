import { SidebarGroup, SidebarGroupLabel } from "@/components/ui/sidebar";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import useStarStore from "@/stores/star";
import { useDragAndDropContext } from "./hooks/use-dnd";
import { DraggableStarContainer } from "./components/draggable-star-container";

export default function StarsArea() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const { fetchList, orderedStars } = useStarStore();
  const { activeId } = useDragAndDropContext();

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
          {orderedStars.map((star, index) => (
            <DraggableStarContainer key={star.id} index={index} star={star} isDragging={activeId === star.id} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
