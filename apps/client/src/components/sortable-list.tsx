import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { cn } from '@idea/ui/shadcn/utils';
import { Button } from '@idea/ui/shadcn/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@idea/ui/shadcn/ui/tooltip';
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { ScrollArea } from '@idea/ui/shadcn/ui/scroll-area';

/**
 * Props for SortableList
 *
 * @template T - The type of the sortable items (must have an id field)
 * @property {T[]} items - The list of items to render and sort
 * @property {(item: T) => React.ReactNode} renderItem - Render function for each item
 * @property {(items: T[]) => void} [onReorder] - Callback when the order changes
 * @property {boolean} [disabled] - Disable drag and drop
 * @property {string} [className] - Additional class names for the container
 * @property {number} [containerHeight] - The scrollable area height in px (applies to the ScrollArea)
 * @property {boolean} [virtual] - Enable virtual list rendering for large lists
 * @property {number} [estimatedItemHeight] - Estimated height of each item in px (used only when virtual is true)
 */
interface SortableListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  onReorder?: (items: T[]) => void;
  disabled?: boolean;
  className?: string;
  /**
   * The scrollable area height in px (applies to the ScrollArea).
   * Controls the visible height of the list before scrolling is needed.
   */
  containerHeight?: number;
  /**
   * Enable virtual list rendering for large lists.
   * If true, only visible items are rendered for performance.
   */
  virtual?: boolean;
  /**
   * Estimated height of each item in px (used only when virtual is true).
   * This is not the exact rendered size, but an estimate for virtualization calculations.
   */
  estimatedItemHeight?: number;
}

export function SortableList<T extends { id: string }>({
  items,
  renderItem,
  onReorder,
  disabled,
  className,
  containerHeight = 400,
  virtual = false,
  estimatedItemHeight = 40,
}: SortableListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan: 5,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = [...items];
      const [movedItem] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, movedItem);

      onReorder?.(newItems);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <ScrollArea style={{ maxHeight: containerHeight }} className={cn(className, "overflow-y-auto")}>
          <div ref={parentRef}>
            {virtual ? (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = items[virtualRow.index];
                  return (
                    <SortableItem
                      key={item.id}
                      id={item.id}
                      item={item}
                      disabled={disabled}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${estimatedItemHeight}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {renderItem(item)}
                    </SortableItem>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <SortableItem key={item.id} id={item.id} item={item} disabled={disabled}>
                    {renderItem(item)}
                  </SortableItem>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SortableContext>
    </DndContext>
  );
}

interface SortableItemProps<T> {
  item: T;
  id: string;
  children: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export function SortableItem<T>({ item, id, children, disabled, style }: SortableItemProps<T>) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });

  const itemStyle = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={itemStyle}
      className={cn("flex items-center rounded-lg border bg-card p-1 text-card-foreground shadow-sm", isDragging && "cursor-grabbing")}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="cursor-grab touch-none" {...attributes} {...listeners}>
              <GripVertical className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Drag to reorder</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {children}
    </div>
  );
}
