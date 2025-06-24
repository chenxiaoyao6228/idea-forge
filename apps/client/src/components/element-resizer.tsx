import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";

export type ResizePosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface ResizerProps {
  onResize?: (size: { width: number; height: number }) => void;
  onResizeStart?: () => void;
  onResizeEnd?: (size: { width: number; height: number }) => void;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  lockAspectRatio?: boolean;
  aspectRatio?: number;
  className?: string;
  children: React.ReactNode;
}

const positionClasses: Record<ResizePosition, string> = {
  "top-left": "-top-1.5 -left-1.5 cursor-nw-resize",
  "top-right": "-top-1.5 -right-1.5 cursor-ne-resize",
  "bottom-left": "-bottom-1.5 -left-1.5 cursor-sw-resize",
  "bottom-right": "-bottom-1.5 -right-1.5 cursor-se-resize",
};

export function Resizer({
  onResize,
  onResizeStart,
  onResizeEnd,
  minWidth = 100,
  minHeight = 100,
  maxWidth = 1200,
  maxHeight = 1200,
  lockAspectRatio = true,
  aspectRatio = 1,
  className,
  children,
}: ResizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);

  const handleResizeStart = useCallback(
    (position: ResizePosition) => (e: React.PointerEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = containerRef.current.offsetWidth;
      const startHeight = containerRef.current.offsetHeight;

      setIsResizing(true);
      onResizeStart?.();

      function handlePointerMove(e: PointerEvent) {
        if (!containerRef.current) return;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Calculate new dimensions based on resize handle position
        let newWidth: number;
        let newHeight: number;

        // Handle horizontal resizing
        if (position.includes("left")) {
          newWidth = startWidth - deltaX; // Moving left handle left makes element wider
        } else {
          newWidth = startWidth + deltaX; // Moving right handle right makes element wider
        }

        // Handle vertical resizing
        if (position.includes("top")) {
          newHeight = startHeight - deltaY; // Moving top handle up makes element taller
        } else {
          newHeight = startHeight + deltaY; // Moving bottom handle down makes element taller
        }

        // Handle aspect ratio locking
        if (lockAspectRatio) {
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = newHeight * aspectRatio;
          }
        }

        // Constrain dimensions within bounds
        newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
        newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

        onResize?.({ width: newWidth, height: newHeight });
      }

      function handlePointerUp() {
        setIsResizing(false);
        onResizeEnd?.({
          width: containerRef.current!.offsetWidth,
          height: containerRef.current!.offsetHeight,
        });
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
      }

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [aspectRatio, lockAspectRatio, maxHeight, maxWidth, minHeight, minWidth, onResize, onResizeEnd, onResizeStart],
  );

  return (
    <div
      ref={containerRef}
      className={cn("element-resizer relative group inline-block touch-none", className, {
        "select-none": isResizing,
      })}
    >
      {children}

      {/* Resize handles */}
      {Object.entries(positionClasses).map(([position, classes]) => (
        <div
          key={position}
          className={cn(
            "absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-full",
            "hover:scale-125 transition-transform",
            "opacity-0 group-hover:opacity-100",
            "touch-none",
            classes,
          )}
          onPointerDown={handleResizeStart(position as ResizePosition)}
        />
      ))}
    </div>
  );
}
