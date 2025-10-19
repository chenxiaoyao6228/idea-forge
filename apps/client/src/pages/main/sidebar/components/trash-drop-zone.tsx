import { useDroppable, useDndContext } from "@dnd-kit/core";
import { Trash2 } from "lucide-react";
import { cn } from '@idea/ui/shadcn/utils';
import { useTranslation } from "react-i18next";
import { showTrashModal } from "../trash-dialog";

interface TrashDropZoneProps {
  className?: string;
}

export function TrashDropZone({ className }: TrashDropZoneProps) {
  const { t } = useTranslation();
  const { active } = useDndContext();

  // Check if we're dragging a document
  const isDraggingDocument = active?.data?.current?.type === "document";

  const { isOver, setNodeRef } = useDroppable({
    id: "trash-drop-zone",
    data: {
      accept: ["document"],
      dropType: "trash",
    },
    disabled: !isDraggingDocument,
  });

  const handleClick = () => {
    showTrashModal();
  };

  return (
    <button
      ref={setNodeRef}
      onClick={handleClick}
      className={cn(
        "group/tree-node relative flex w-full items-center justify-center py-2 px-2",
        "transition-all duration-200 ease-in-out",
        "hover:bg-accent/50 dark:hover:bg-accent/25",
        "text-sm font-normal",
        "border-r border-border", // Add right border for separation
        // Visual feedback when dragging over
        isOver && "bg-destructive/20 border-destructive/50 scale-105",
        isDraggingDocument && !isOver && "bg-accent/30",
        className,
      )}
      title={isOver ? t("Drop to delete") : t("Trash")}
      aria-label={t("Trash - Click to open or drag documents here to delete")}
    >
      <Trash2
        className={cn(
          "h-4 w-4 mr-2 shrink-0 transition-all duration-200",
          isOver && "text-destructive scale-110",
          isDraggingDocument && !isOver && "text-muted-foreground",
        )}
      />
      <span className={cn("truncate transition-colors duration-200", isOver && "text-destructive font-medium")}>{t("Trash")}</span>

      {/* Visual indicator when dragging over */}
      {isOver && <div className="absolute inset-0 bg-destructive/10 border-2 border-destructive/50 rounded-sm pointer-events-none animate-pulse" />}

      {/* Subtle glow effect when dragging documents */}
      {isDraggingDocument && !isOver && <div className="absolute inset-0 bg-accent/5 rounded-sm pointer-events-none" />}
    </button>
  );
}
