import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import Logo from "@/components/logo";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils";
import DocumentHeader from "./components/doc-header";
import { NavBasic } from "./components/nav-basic";
import { MyDocs } from "./components/my-docs";
import DocDetail from "./components/doc-detail";
import { OthersDocs } from "./components/others-docs";
import UserSettings from "./modules/setting";

export default function Doc() {
  return (
    <SidebarProvider>
      {/* sidebar */}
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <SidebarGroup>
            <Logo />
          </SidebarGroup>
          <NavBasic />
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
