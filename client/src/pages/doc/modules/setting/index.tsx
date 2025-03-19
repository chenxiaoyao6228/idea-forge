import { ChevronsUpDown, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import useUserStore from "@/stores/user";
import { SignOutDialog, useSignOutDialog } from "./signout-dialog";
import { useTranslation } from "react-i18next";

/*
 * Shadcn Dialog inside of Dropdown closes automatically, see:
 * https://stackoverflow.com/questions/77185827/shadcn-dialog-inside-of-dropdown-closes-automatically
 * Do not use: <DropdownMenuItem onSelect={(e) => e.preventDefault()}>, use preventDefault will cause your page freeze
 * cause it will add a pointer-events: none to the body, so you can't click any element on the page
 */
export default function UserSettings() {
  const { isMobile } = useSidebar();
  const user = useUserStore((state) => state.userInfo);
  const { t } = useTranslation();
  const { onOpen: onSignOutOpen } = useSignOutDialog();

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user?.imageUrl} alt={user?.displayName} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user?.displayName}</span>
                  <span className="truncate text-xs">{user?.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuItem onClick={onSignOutOpen}>
                <div className="flex items-center gap-2 px-1 py-0 text-left text-sm">
                  <LogOut className="h-4 w-4" />
                  <span className="ml-2">{t("Sign Out")}</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <SignOutDialog />
    </>
  );
}
