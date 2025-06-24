import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuItem,
  SidebarMenu,
  SidebarRail,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { SearchDocDialog } from "@/pages/main/sidebar/search-doc-dialog";
import Loading from "@/components/ui/loading";
import WorkspaceSwitcher from "./sidebar/workspace-switcher";
import UserSettings from "./sidebar/setting";
import Doc from "../doc";
import SubspacesArea from "./sidebar/subspaces";
import { useDragAndDropContext } from "./sidebar/hooks/use-dnd";
import { DndContext } from "@dnd-kit/core";
import { websocketService } from "@/lib/websocket";
import StarsArea from "./sidebar/stars";
import useUIStore from "@/stores/ui";
import SharedWithMe from "./sidebar/shared-with-me";
import MyDocsArea from "./sidebar/ my-docs";
import useDocumentStore from "@/stores/document";
import { TrashDialog } from "./sidebar/trash-dialog";

export default function Main() {
  const { sensors, handleDragStart, handleDragEnd, handleDragMove, handleDragOver } = useDragAndDropContext();

  const { docId } = useParams();
  const setActiveDocumentId = useUIStore((state) => state.setActiveDocumentId);
  const isLoading = useDocumentStore((state) => state.isFetching);

  useEffect(() => {
    setActiveDocumentId(docId || "");
  }, [docId, setActiveDocumentId]);

  useEffect(() => {
    websocketService.connect();
    return () => {
      websocketService.disconnect();
    };
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  let content = <></>;
  if (docId) {
    content = <Doc />;
  }

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
            <SharedWithMe />
            <SubspacesArea />
            <MyDocsArea />
            {/* <OthersDocs /> */}
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
}
