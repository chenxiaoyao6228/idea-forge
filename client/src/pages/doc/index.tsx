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
import Logo from "@/components/logo";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils";
import DocumentHeader from "./modules/sidebar/doc-header";
import { MyDocs } from "./modules/sidebar/my-docs";
import { OthersDocs } from "./modules/sidebar/others-docs";
import UserSettings from "./modules/setting";
import DocDetail from "./modules/detail";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useDocumentStore } from "./stores/doc-store";
import { TrashDialog } from "@/pages/doc/components/trash-dialog";
import { SearchDocDialog } from "@/pages/doc/components/search-doc-dialog";
import BackToTop from "@/components/ui/back-to-top";

export default function Doc() {
  const { docId } = useParams();
  const setCurrentDocId = useDocumentStore.use.setCurrentDocId();

  useEffect(() => {
    setCurrentDocId(docId || null);
  }, [docId, setCurrentDocId]);

  return (
    <SidebarProvider>
      {/* sidebar */}
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <SidebarGroup>
            <Logo />
          </SidebarGroup>
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            <SidebarMenu>
              {/* <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/doc/0">
                    <Icon name="Home" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
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
      <SidebarInset className={cn("h-full relative")}>
        <DocumentHeader />
        <DocDetail />
        <BackToTop />
      </SidebarInset>
    </SidebarProvider>
  );
}
