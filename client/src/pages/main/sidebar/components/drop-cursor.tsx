import { cn } from "@/lib/utils";

interface DropCursorProps {
  isActiveDrop: boolean;
  innerRef: any;
  position?: "top" | "bottom";
}

function DropCursor({ isActiveDrop, innerRef, position = "bottom" }: DropCursorProps) {
  if (!isActiveDrop) return null;

  return (
    <div
      ref={innerRef}
      className={cn(
        "absolute w-full h-[14px] bg-transparent z-10 transition-opacity duration-150",
        position === "top" ? "-top-[7px]" : "-bottom-[7px]",
        "after:content-[''] after:absolute after:top-[6px] after:h-[2px] after:w-full after:bg-slate-700 after:rounded-[2px]",
      )}
    />
  );
}

export default DropCursor;
