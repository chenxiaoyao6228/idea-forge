import { FileText } from "lucide-react";
import { Button } from '@idea/ui/shadcn/ui/button';
import { Alert, AlertDescription } from '@idea/ui/shadcn/ui/alert';
import { PublicLink } from "./public-link";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarRail } from '@idea/ui/shadcn/ui/sidebar';
import { NavigationTreeNode } from "@idea/contracts";
import Logo from "@/components/logo";
import useUserStore from "@/stores/user-store";

interface PublicSidebarProps {
  navigationTree: NavigationTreeNode;
  token: string;
  activeDocId?: string;
  workspaceName: string;
  docId: string;
}

/**
 * Public document sidebar using Shadcn/UI Sidebar components
 * Provides hierarchical navigation for public documents
 */
export function PublicSidebar({ navigationTree, token, activeDocId, workspaceName, docId }: PublicSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userInfo = useUserStore((state) => state.userInfo);

  // Check if user is authenticated by checking if userInfo exists
  // Note: httpOnly cookies cannot be read by JavaScript, so we check the store instead
  const isAuthenticated = !!userInfo;

  // Handle button click - redirect to login or document page
  const handleButtonClick = () => {
    if (!isAuthenticated) {
      // Unauthenticated: Go to login with redirect back to document
      const docUrl = `/${docId}`;
      navigate(`/login?redirect=${encodeURIComponent(docUrl)}`);
    } else {
      // Authenticated: Go directly to document page
      // Middleware will let through, WithAuth HOC validates, Main component handles permissions
      navigate(`/${docId}`);
    }
  };

  // Dynamic button text based on auth state
  const getButtonText = () => {
    return isAuthenticated ? t("Go to Edit") : t("Login to Edit");
  };

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

      {/* Footer - Auth-aware edit button */}
      <SidebarFooter className="p-0 gap-0">
        {/* Show alert only for unauthenticated users */}
        {!isAuthenticated && (
          <div className="p-4">
            <Alert>
              <AlertDescription className="text-sm">
                {t(
                  "You are viewing a publicly shared document. To edit this document or access the full workspace, please sign in and request access from the workspace administrator.",
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}
        <div className="p-4 border-t">
          <Button size="sm" className="w-full" onClick={handleButtonClick}>
            {getButtonText()}
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
