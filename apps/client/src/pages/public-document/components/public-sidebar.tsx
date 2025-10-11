import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PublicLink } from "./public-link";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarRail } from "@/components/ui/sidebar";
import { NavigationTreeNode } from "@idea/contracts";
import Logo from "@/components/logo";

interface PublicSidebarProps {
  navigationTree: NavigationTreeNode;
  token: string;
  activeDocId?: string;
  workspaceName: string;
}

/**
 * Public document sidebar using Shadcn/UI Sidebar components
 * Provides hierarchical navigation for public documents
 */
export function PublicSidebar({ navigationTree, token, activeDocId, workspaceName }: PublicSidebarProps) {
  const { t } = useTranslation();

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      {/* Header */}
      <SidebarHeader className="p-2 justify-center h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Logo />
      </SidebarHeader>

      {/* Navigation Tree */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <PublicLink node={navigationTree} token={token} activeDocId={activeDocId} />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* TODO: figure out how to handle this to allow editing and commenting */}
      {/* Footer - Public access notice */}
      <SidebarFooter className="p-0 gap-0">
        <div className="p-4">
          <Alert>
            <AlertDescription className="text-sm">
              {t(
                "You are viewing a publicly shared document. To edit this document or access the full workspace, please sign in and request access from the workspace administrator.",
              )}
            </AlertDescription>
          </Alert>
        </div>
        <div className="p-4 border-t">
          <Link to="/marketing" className="w-full">
            <Button size="sm" className="w-full">
              {t("Sign in to edit")}
            </Button>
          </Link>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
