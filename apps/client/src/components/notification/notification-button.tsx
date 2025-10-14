import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NotificationPanel } from "./notification-panel";
import { useNotificationBadgeCount, useFetchUnreadCount } from "@/stores/notification-store";
import { cn } from "@/lib/utils";

interface NotificationButtonProps {
  className?: string;
  /** Size variant: 'sm' for header, 'lg' for sidebar */
  size?: "sm" | "lg";
  /** Custom button component (e.g., SidebarMenuButton) */
  as?: React.ElementType;
}

export function NotificationButton({ className, size = "lg", as }: NotificationButtonProps) {
  const [open, setOpen] = useState(false);
  const badgeCount = useNotificationBadgeCount();
  const fetchUnreadCount = useFetchUnreadCount();

  // Fetch unread count on mount and when panel opens
  useEffect(() => {
    fetchUnreadCount.run();
  }, []);

  // Refetch when panel opens
  useEffect(() => {
    if (open) {
      fetchUnreadCount.run();
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
          <Bell className={iconSize} />
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
