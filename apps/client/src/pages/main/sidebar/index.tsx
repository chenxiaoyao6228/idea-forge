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
import UserSettings from "./setting";
import MyDocsArea from "./ my-docs";
import React from "react";

const SidebarContainer = ({ content }: { content: React.ReactNode }) => {
  console.log("SidebarContainer render");
  const { sensors, handleDragStart, handleDragEnd, handleDragMove, handleDragOver } = useDragAndDropContext();

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
                    {/* trash */}
                    <TrashDialog />
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
            <UserSettings />
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
