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
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useDocumentStore } from "./stores/doc-store";
import { TableOfContent } from "./components/table-of-content";
import { TrashDialog } from "@/components/ui/trash-dialog";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      </SidebarInset>
    </SidebarProvider>
  );
}
