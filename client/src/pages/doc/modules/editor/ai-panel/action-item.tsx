import { cn } from "@/lib/utils";
import { CornerDownLeft } from "lucide-react";

interface ActionItemProps {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export default function ActionItem({ icon, label, onClick }: ActionItemProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none min-w-[200px]",
        "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent dark:hover:text-accent-foreground",
        "focus:bg-accent focus:text-accent-foreground dark:focus:bg-accent dark:focus:text-accent-foreground",
        "group relative",
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onClick) {
          onClick();
        }
      }}
    >
      <span className="flex items-center gap-2 flex-1">
        {icon && <span>{icon}</span>}
        <span>{label}</span>
      </span>
      <CornerDownLeft className={cn("h-4 w-4 text-muted-foreground dark:text-muted-foreground opacity-0 transition-opacity", "group-hover:opacity-100")} />
    </button>
  );
}
