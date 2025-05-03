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
import { usePrepareDoc } from "@/hooks/use-prepare-doc";
import Loading from "@/components/loading";
import { useDocumentStore } from "../../stores/doc-store";
import WorkspaceSwitcher from "./sidebar/workspace-switcher";
import { OthersDocs } from "./sidebar/others-docs";
import { MyDocs } from "./sidebar/my-docs";
import UserSettings from "./sidebar/setting";
import Doc from "../doc";

export default function Main() {
  const { docId } = useParams();
  const setCurrentDocId = useDocumentStore.use.setCurrentDocId();
  const { isLoading } = usePrepareDoc();

  useEffect(() => {
    setCurrentDocId(docId || null);
  }, [docId, setCurrentDocId]);

  if (isLoading) {
    return <Loading />;
  }

  let content = <></>;
  if (docId) {
    content = <Doc />;
  }

  return (
    <SidebarProvider>
      {/* sidebar */}
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <WorkspaceSwitcher />
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <SearchDocDialog />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <TrashDialog />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarHeader>
        <SidebarContent className="custom-scrollbar">
          <OthersDocs />
          <MyDocs />
        </SidebarContent>
        <SidebarFooter>
          <UserSettings />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      {/* content */}
      <SidebarInset className={cn("h-full relative")}>{content}</SidebarInset>
    </SidebarProvider>
  );
}
