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
import { TrashDialog } from "@/pages/main/sidebar/trash-dialog";
import { SearchDocDialog } from "@/pages/main/sidebar/search-doc-dialog";
// import { usePrepareDoc } from "@/hooks/use-prepare-doc";
import Loading from "@/components/ui/loading";
import { useDocumentStore } from "../../stores/doc-store";
import WorkspaceSwitcher from "./sidebar/workspace-switcher";
import { OthersDocs } from "./sidebar/others-docs";
import UserSettings from "./sidebar/setting";
import Doc from "../doc";
import SubspacesArea from "./sidebar/subspaces";
import { PrivateDocs } from "./sidebar/private";
import { useDragAndDropContext } from "./sidebar/hooks/use-dnd";
import useSubSpaceStore from "@/stores/subspace";
import { DndContext } from "@dnd-kit/core";
import { websocketService } from "@/lib/websocket";
import StarsArea from "./sidebar/stars";

export default function Main() {
  const { sensors, handleDragStart, handleDragEnd, handleDragMove, handleDragOver } = useDragAndDropContext();

  const { docId } = useParams();
  const setCurrentDocId = useDocumentStore.use.setCurrentDocId();

  useEffect(() => {
    setCurrentDocId(docId || null);
  }, [docId, setCurrentDocId]);

  // if (isLoading) {
  //   return <Loading />;
  // }

  let content = <></>;
  if (docId) {
    content = <Doc />;
  }

  useEffect(() => {
    websocketService.connect();
    return () => {
      websocketService.disconnect();
    };
  }, []);

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
            {/* <OthersDocs /> */}
            {/* <PrivateDocs /> */}
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
