import { SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarRail, SidebarMenuButton, Sidebar } from "@idea/ui/shadcn/ui/sidebar";
import { SidebarInset, SidebarProvider } from "@idea/ui/shadcn/ui/sidebar";
import { cn } from "@idea/ui/shadcn/utils";
import { useDragAndDropContext } from "./hooks/use-dnd";
import { DndContext } from "@dnd-kit/core";
import WorkspaceSwitcher from "./workspace-switcher";
import { showTemplateModal } from "./template-dialog";
import { showSearchModal } from "./search-doc-dialog";
import { showImportFilesModal } from "./import-files-dialog";
import { MoreOptionsDropdown } from "./more-options-dropdown";
import { TrashDropZone } from "./components/trash-drop-zone";
import StarsArea from "./stars";
import SharedWithMe from "./shared-with-me";
import SubspacesArea from "./subspaces";
import MyDocsArea from "./ my-docs";
import React from "react";
import { Search as SearchIcon, Users, Trash2, Box, Settings, Plus, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { showSettingModal } from "@/pages/main/settings/setting-modal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@idea/ui/shadcn/ui/tooltip";
import { useWorkspaceType } from "@/hooks/use-workspace-type";
import { useIsGuestCollaborator } from "@/stores/guest-collaborators-store";
import { useNavigate } from "react-router-dom";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Alert, AlertDescription } from "@idea/ui/shadcn/ui/alert";
import { NotificationButton } from "@/pages/main/sidebar/notification";

const SidebarContainer = ({ content }: { content: React.ReactNode }) => {
  const { sensors, handleDragStart, handleDragEnd, handleDragMove, handleDragOver } = useDragAndDropContext();
  const { t } = useTranslation();
  const { isPersonalWorkspace } = useWorkspaceType();
  const isGuestCollaborator = useIsGuestCollaborator();
  const navigate = useNavigate();

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragMove={handleDragMove} onDragOver={handleDragOver}>
      <SidebarProvider defaultOpen={true}>
        {/* sidebar */}
        <Sidebar collapsible="offcanvas">
          <SidebarHeader className="p-0 gap-0">
            {/* WorkspaceSwitcher */}
            <WorkspaceSwitcher />

            {/* Quick start */}
            <SidebarGroup className="group-data-[collapsible=icon]:hidden py-1 px-2">
              <div className="flex items-center justify-between w-full gap-1">
                {!isGuestCollaborator && (
                  <>
                    {/* Search */}
                    <div className="flex items-center justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              onClick={() => showSearchModal()}
                              className="flex items-center justify-center hover:bg-accent/50 dark:hover:bg-accent/25 transition-colors h-10 w-10"
                            >
                              <SearchIcon className="h-5 w-5" />
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("Search documents")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {/* Import Files */}
                    <div className="flex items-center justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              onClick={() => showImportFilesModal()}
                              className="flex items-center justify-center hover:bg-accent/50 dark:hover:bg-accent/25 transition-colors h-10 w-10"
                            >
                              <Upload className="h-5 w-5" />
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("Import files")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* Workspace Settings */}
                    <div className="flex items-center justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <SidebarMenuButton
                              onClick={() => showSettingModal({ tab: "profile" })}
                              className="flex items-center justify-center hover:bg-accent/50 dark:hover:bg-accent/25 transition-colors h-10 w-10"
                            >
                              <Settings className="h-5 w-5" />
                            </SidebarMenuButton>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("Settings")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* Notifications */}
                    <div className="flex items-center justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <NotificationButton size="lg" as={SidebarMenuButton} />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("Notifications")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {/* More Options */}
                    <div className="flex items-center justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <MoreOptionsDropdown />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t("More options")}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </>
                )}
              </div>
            </SidebarGroup>
          </SidebarHeader>
          {/* docs */}
          <SidebarContent className="custom-scrollbar">
            {isGuestCollaborator ? (
              // Guest-only view: only show WorkspaceSwitcher and SharedWithMe
              <>
                <SharedWithMe />
                <MyDocsArea />
              </>
            ) : (
              // Full workspace view for regular users
              <>
                <StarsArea />
                {!isPersonalWorkspace && <SubspacesArea />}
                <SharedWithMe />
                <MyDocsArea />
              </>
            )}
          </SidebarContent>
          {!isGuestCollaborator && (
            <SidebarFooter className="p-0 gap-0">
              {/* Two-column footer with trash and template */}
              <div className="grid grid-cols-2 gap-0 border-t">
                {/* Trash drop zone */}
                <TrashDropZone />

                {/* Template button */}
                <button
                  onClick={() => showTemplateModal()}
                  className={cn(
                    "group/tree-node relative flex w-full items-center justify-center py-2 px-2",
                    "transition-colors",
                    "hover:bg-accent/50 dark:hover:bg-accent/25",
                    "text-sm font-normal",
                  )}
                >
                  <Box className="h-4 w-4 mr-2 shrink-0" />
                  <span className="truncate">{t("Templates")}</span>
                </button>
              </div>
            </SidebarFooter>
          )}
          {isGuestCollaborator && (
            <SidebarFooter className="p-0 gap-0">
              <div className="p-4">
                <Alert>
                  <AlertDescription className="text-sm ">
                    {t(
                      "Your identity in the current space is a collaborative guest, and you can only participate in viewing or collaborative editing of specified pages. If you need to access all public content in the entire space, you can contact the administrator to upgrade you to a space member.",
                    )}
                  </AlertDescription>
                </Alert>
              </div>
              <div className="p-4 border-t">
                <Button onClick={() => navigate("/create-workspace")} className="w-full" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("Create My Space")}
                </Button>
              </div>
            </SidebarFooter>
          )}
          <SidebarRail />
        </Sidebar>
        {/* content */}
        <SidebarInset className={cn("h-full w-full relative")}>{content}</SidebarInset>
      </SidebarProvider>
    </DndContext>
  );
};

export default React.memo(SidebarContainer);
