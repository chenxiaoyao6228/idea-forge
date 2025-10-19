import React from "react";
import { useTranslation } from "react-i18next";
import { MoreHorizontal, HelpCircle, Keyboard, Info } from "lucide-react";
import { SidebarMenuButton } from '@idea/ui/shadcn/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@idea/ui/shadcn/ui/dropdown-menu';

export const MoreOptionsDropdown = React.forwardRef<HTMLButtonElement>((props, ref) => {
  const { t } = useTranslation();

  const handleHelp = () => {
    // TODO: Implement help functionality
    console.log("Help clicked");
  };

  const handleKeyboardShortcuts = () => {
    // TODO: Implement keyboard shortcuts modal
    console.log("Keyboard shortcuts clicked");
  };

  const handleAbout = () => {
    // TODO: Implement about modal
    console.log("About clicked");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton ref={ref} className="flex items-center justify-center hover:bg-accent/50 dark:hover:bg-accent/25 transition-colors">
          <MoreHorizontal className="h-6 w-6" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={handleHelp} className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          {t("Help")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleKeyboardShortcuts} className="flex items-center gap-2">
          <Keyboard className="h-4 w-4" />
          {t("Keyboard Shortcuts")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleAbout} className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          {t("About")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

MoreOptionsDropdown.displayName = "MoreOptionsDropdown";
