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
import DocumentHeader from "./components/doc-header";
import { MyDocs } from "./components/my-docs";
import { OthersDocs } from "./components/others-docs";
import UserSettings from "./modules/setting";
import DocDetail from "./modules/detail";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/icon";
import { useParams } from "react-router-dom";

export default function Doc() {
  const { docId: curDocId } = useParams();

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
              {/* navDocHome */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/doc/0">
                    <Icon name="Home" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* search */}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarHeader>
        <SidebarContent className="custom-scrollbar">
          <OthersDocs curDocId={curDocId} />
          <MyDocs curDocId={curDocId} />
        </SidebarContent>
        <SidebarFooter>
          <UserSettings />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      {/* content */}
      <SidebarInset className={cn("h-full relative")}>
        <DocumentHeader />
        <DocDetail curDocId={curDocId} />
      </SidebarInset>
    </SidebarProvider>
  );
}
