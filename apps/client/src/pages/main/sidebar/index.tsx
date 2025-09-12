import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuItem,
  SidebarMenu,
  SidebarRail,
  SidebarMenuButton,
  Sidebar,
} from "@/components/ui/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils";
import { useDragAndDropContext } from "./hooks/use-dnd";
import { DndContext } from "@dnd-kit/core";
import WorkspaceSwitcher from "./workspace-switcher";
import { TrashDialog } from "./trash-dialog";
import { SearchDocDialog } from "./search-doc-dialog";
import StarsArea from "./stars";
import SharedWithMe from "./shared-with-me";
import SubspacesArea from "./subspaces";
import MyDocsArea from "./ my-docs";
import React from "react";
import { Button } from "@/components/ui/button";
import { SettingsIcon, Search as SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { settingModal } from "@/pages/main/settings/setting-modal";

const SidebarContainer = ({ content }: { content: React.ReactNode }) => {
  const { sensors, handleDragStart, handleDragEnd, handleDragMove, handleDragOver } = useDragAndDropContext();
  const { t } = useTranslation();

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragMove={handleDragMove} onDragOver={handleDragOver}>
      <SidebarProvider>
        {/* sidebar */}
        <Sidebar collapsible="offcanvas">
          <SidebarHeader>
            {/* WorkspaceSwitcher */}
            <WorkspaceSwitcher />

            {/* Quick start */}
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    {/* search doc */}
                    <SearchDocDialog />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    {/* setting */}
                    <button
                      onClick={() => {
                        settingModal({
                          tab: "subspace",
                        });
                      }}
                      className={cn(
                        "group/tree-node relative flex w-full items-center py-1 px-2",
                        "rounded-lg transition-colors",
                        "hover:bg-accent/50 dark:hover:bg-accent/25",
                        "text-sm font-normal",
                      )}
                    >
                      <SettingsIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{t("Settings")}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          </SidebarHeader>
          {/* docs */}
          <SidebarContent className="custom-scrollbar">
            <StarsArea />
            <SubspacesArea />
            <SharedWithMe />
            <MyDocsArea />
          </SidebarContent>
          <SidebarFooter>
            {/* trash */}
            <TrashDialog />
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>
        {/* content */}
        <SidebarInset className={cn("h-full relative")}>{content}</SidebarInset>
      </SidebarProvider>
    </DndContext>
  );
};

export default React.memo(SidebarContainer);
