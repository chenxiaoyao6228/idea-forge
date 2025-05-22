import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";

export interface NavigationItemProps {
  icon?: React.ReactNode;
  label: React.ReactNode;
  active?: boolean;
  expanded?: boolean;
  onDisclosureClick?: (ev?: React.MouseEvent) => void;
  children?: React.ReactNode;
  depth?: number;
  showActions?: boolean;
  menu?: React.ReactNode;
  disabled?: boolean;
  isDragging?: boolean;
  isActiveDrop?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

export function NavigationItem({
  icon,
  label,
  active,
  expanded,
  onDisclosureClick,
  children,
  depth = 0,
  showActions,
  menu,
  disabled,
  isDragging,
  isActiveDrop,
  onClick,
}: NavigationItemProps) {
  const content = (
    <div
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-lg px-2 py-2",
        "hover:bg-accent/50 dark:hover:bg-accent/25",
        active && "bg-accent dark:bg-accent/50",
        disabled && "opacity-50 pointer-events-none",
        isDragging && "opacity-50",
        isActiveDrop && "bg-accent dark:bg-accent/50",
      )}
      style={{ paddingLeft: `${(depth + 1) * 12}px` }}
      onClick={onClick}
    >
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <div className="flex-1 truncate text-sm">{label}</div>
      {menu && (
        <div className={cn("invisible ml-2 flex-shrink-0 opacity-0", "group-hover:visible group-hover:opacity-100", showActions && "visible opacity-100")}>
          {menu}
        </div>
      )}
    </div>
  );

  if (onDisclosureClick) {
    return (
      <Collapsible open={expanded}>
        <div className="flex items-center">
          <CollapsibleTrigger asChild onClick={onDisclosureClick}>
            <Button variant="ghost" size="icon" className="h-4 w-4 p-0">
              <ChevronRight className={cn("h-4 w-4 shrink-0 transition-transform duration-200", expanded && "rotate-90")} />
            </Button>
          </CollapsibleTrigger>
          {content}
        </div>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Collapsible>
    );
  }

  return content;
}
