import React from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import Logo from "@/components/logo";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { cn } from "@/lib/utils";
import DocumentHeader from "./components/header";
import { NavBasic } from "./components/nav-basic";
import { MyDocs } from "./components/my-docs";
import { TestDoc } from "./components/_test-doc";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
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
          <MyDocs />
        </SidebarContent>
        <SidebarFooter>{/* TODO: settings */}</SidebarFooter>
        <SidebarRail />
      </Sidebar>
      {/* content */}
      <SidebarInset className={cn("h-full relative")}>
        <DocumentHeader />
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
