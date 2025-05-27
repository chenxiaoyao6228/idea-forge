import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { NavLink, NavLinkProps } from "./nav-link";
import { useMemo } from "react";

export interface SidebarLinkProps extends Omit<NavLinkProps, "children"> {
  icon?: React.ReactNode;
  label: React.ReactNode;
  expanded?: boolean;
  onDisclosureClick?: (ev?: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
  depth?: number;
  showActions?: boolean;
  menu?: React.ReactNode;
  disabled?: boolean;
  isDraft?: boolean;
  isActiveDrop?: boolean;
  active?: boolean;
}

export function SidebarLink({
  icon,
  label,
  expanded,
  onDisclosureClick,
  children,
  depth = 0,
  showActions,
  menu,
  disabled,
  isDraft,
  isActiveDrop,
  active,
  to,
  className,
  ...rest
}: SidebarLinkProps) {
  const style = useMemo(
    () => ({
      paddingLeft: `${depth * 16 + 12}px`,
    }),
    [depth],
  );

  const linkContent = (
    <div
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-lg px-3 py-1 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground",
        isActiveDrop && "bg-accent text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        isDraft && "border border-dashed border-muted-foreground/50",
        className,
      )}
      style={style}
    >
      {expanded !== undefined && (
        <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-transparent" onClick={onDisclosureClick}>
          <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
        </Button>
      )}

      {icon && <div className="flex-shrink-0">{icon}</div>}

      <div className="flex-1 truncate">{label}</div>

      {menu && (
        <div className={cn("invisible opacity-0 transition-all", "group-hover:visible group-hover:opacity-100", showActions && "visible opacity-100")}>
          {menu}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <>
        <NavLink to={to} className="block" {...rest}>
          {linkContent}
        </NavLink>
        {expanded !== undefined && children && (
          <Collapsible open={expanded}>
            <CollapsibleContent className="pl-4">{children}</CollapsibleContent>
          </Collapsible>
        )}
      </>
    );
  }

  return (
    <>
      {linkContent}
      {expanded !== undefined && children && (
        <Collapsible open={expanded}>
          <CollapsibleContent className="pl-4">{children}</CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}
