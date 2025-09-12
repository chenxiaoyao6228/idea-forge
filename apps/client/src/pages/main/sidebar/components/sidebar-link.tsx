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
  className?: string;
  style?: React.CSSProperties;
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
  style,
  ...rest
}: SidebarLinkProps) {
  const linkContent = (
    <div
      className={cn(
        "sidebar-link group relative flex w-full items-center gap-2 rounded-lg pl-6 pr-3 py-1 text-sm transition-colors",
        "hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground",
        isActiveDrop && "bg-accent text-accent-foreground border border-foreground",
        disabled && "pointer-events-none opacity-50",
        isDraft && "border border-dashed border-muted-foreground/50",
        className,
      )}
      // style={computedStyle}
    >
      {expanded !== undefined && (
        <Button variant="ghost" size="sm" className="absolute left-0 top-0 bottom-0 my-auto h-5 w-5 p-0 hover:bg-transparent" onClick={onDisclosureClick}>
          <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
        </Button>
      )}

      {icon && <div className="flex-shrink-0 p-2 -m-2 cursor-pointer hover:bg-accent/40 rounded transition-colors">{icon}</div>}
      <div className="flex-1 truncate">{label}</div>

      {menu && (
        <div className={cn("invisible opacity-0 transition-all", "group-hover:visible group-hover:opacity-100", showActions && "visible opacity-100")}>
          {menu}
        </div>
      )}
    </div>
  );

  return (
    <>
      {to ? (
        <NavLink to={to} className="block rounded-lg" {...rest}>
          {linkContent}
        </NavLink>
      ) : (
        linkContent
      )}
      {expanded !== undefined && children && (
        <Collapsible open={expanded}>
          <CollapsibleContent className="pl-4">{children}</CollapsibleContent>
        </Collapsible>
      )}
    </>
  );
}
