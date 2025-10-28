import { useState, useEffect } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Badge } from "@idea/ui/shadcn/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@idea/ui/shadcn/ui/popover";
import { NotificationPanel } from "./notification-panel";
import { useCurrentWorkspaceNotificationCount, useFetchUnreadCountByWorkspace } from "@/stores/notification-store";
import { cn } from "@idea/ui/shadcn/utils";

interface NotificationButtonProps {
  className?: string;
  /** Size variant: 'sm' for header, 'lg' for sidebar */
  size?: "sm" | "lg";
  /** Custom button component (e.g., SidebarMenuButton) */
  as?: React.ElementType;
}

export function NotificationButton({ className, size = "lg", as }: NotificationButtonProps) {
  const [open, setOpen] = useState(false);
  const badgeCount = useCurrentWorkspaceNotificationCount();
  const fetchUnreadCountByWorkspace = useFetchUnreadCountByWorkspace();

  // Fetch workspace-grouped unread counts on mount (this provides ALL count data)
  useEffect(() => {
    fetchUnreadCountByWorkspace.run();
  }, []);

  // Refetch workspace counts when panel opens
  useEffect(() => {
    if (open) {
      fetchUnreadCountByWorkspace.run();
    }
  }, [open]);

  const ButtonComponent = as || Button;
  const iconSize = size === "lg" ? "h-5 w-5" : "h-4 w-4";
  const badgeSize = size === "lg" ? "h-5 min-w-5 -top-1 -right-1" : "h-4 min-w-4 -top-1 -right-1";
  const buttonClasses = size === "lg" ? "h-10 w-10" : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ButtonComponent
          variant="ghost"
          size="sm"
          className={cn(
            "relative",
            buttonClasses,
            size === "lg" && "flex items-center justify-center hover:bg-accent/50 dark:hover:bg-accent/25 transition-colors",
            className,
          )}
        >
          <Inbox className={iconSize} />
          {badgeCount > 0 && (
            <Badge variant="destructive" className={cn("absolute px-1 text-[10px] font-medium flex items-center justify-center rounded-full", badgeSize)}>
              {badgeCount > 99 ? "99+" : badgeCount}
            </Badge>
          )}
        </ButtonComponent>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={0} alignOffset={10}>
        <NotificationPanel onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
