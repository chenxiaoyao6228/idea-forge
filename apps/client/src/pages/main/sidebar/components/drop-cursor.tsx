import { cn } from "@/lib/utils";

interface DropCursorProps {
  isActiveDrop: boolean;
  innerRef: any;
  position?: "top" | "bottom";
  className?: string;
}

function DropCursor({ isActiveDrop, innerRef, position = "bottom", className = "" }: DropCursorProps) {
  if (!isActiveDrop) return null;

  return (
    <div
      ref={innerRef}
      className={cn(
        "absolute w-full h-[14px] bg-transparent z-20 transition-all duration-200",
        position === "top" ? "-top-[7px]" : "-bottom-[7px]",
        "after:content-[''] after:absolute after:top-[6px] after:h-[3px] after:w-full after:bg-primary after:rounded-[2px] after:shadow-lg after:animate-pulse",
        className,
      )}
    />
  );
}

export default DropCursor;
