import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ChevronDown, MoreHorizontal, User, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import useUserStore from "@/stores/user-store";
import useWorkspaceStore, { useAllWorkspaces, useCurrentWorkspace, useSwitchWorkspace, useReorderWorkspaces } from "@/stores/workspace-store";
import { SortableList } from "@/components/sortable-list";
import { showSettingModal } from "@/pages/main/settings/setting-modal";
import { displayUserName } from "@/lib/auth";

export default function WorkspaceSwitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userInfo = useUserStore((state) => state.userInfo);

  const workspaces = useAllWorkspaces();
  const currentWorkspace = useCurrentWorkspace();
  const { run: switchWorkspace, loading: isSwitching } = useSwitchWorkspace();
  const { run: reorderWorkspaces, loading: isReordering } = useReorderWorkspaces();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const createWorkspace = async () => {
    navigate("/create-workspace");
    setIsDropdownOpen(false);
  };

  const openPersonalSettings = async () => {
    showSettingModal({ tab: "profile" });
  };

  const getWorkspaceInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "W";
  };

  const handleReorder = async (reorderedWorkspaces: typeof workspaces) => {
    // update the server
    try {
      await reorderWorkspaces(reorderedWorkspaces.map((w) => w.id));
    } catch (error) {
      console.error("Failed to reorder workspaces:", error);
    }
  };

  if (!currentWorkspace) {
    return null;
  }

  return (
    <div className="flex flex-col justify-center flex-shrink-0 border-b">
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center w-full justify-between px-2 h-auto hover:bg-accent overflow-x-hidden ">
            <div className="flex items-center space-x-2 truncate flex-1 min-w-0">
              <div className="relative">
                <Avatar className="h-6 w-6">
                  {currentWorkspace?.avatar ? (
                    <AvatarImage src={currentWorkspace.avatar} alt={currentWorkspace.name} />
                  ) : (
                    <AvatarFallback>{getWorkspaceInitial(currentWorkspace?.name || "")}</AvatarFallback>
                  )}
                </Avatar>
              </div>
              <span className="text-sm font-medium truncate">{currentWorkspace?.name || t("Workspace")}</span>
            </div>
            <div className="flex items-center space-x-1 flex-shrink-0">
              <ChevronDown className="h-4 w-4 opacity-70 mr-1" />
              {/* <div className="bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-medium">2</div> */}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-80 py-1 rounded-xl shadow-lg border bg-white">
          {/* basic info */}
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                {userInfo?.imageUrl ? (
                  <AvatarImage src={userInfo.imageUrl} alt={userInfo.displayName || userInfo.email} />
                ) : (
                  <AvatarFallback style={{ backgroundColor: "#FFB6C1" }}>
                    {getWorkspaceInitial(displayUserName({ displayName: userInfo?.displayName, email: userInfo?.email }))}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userInfo?.displayName || userInfo?.email}</span>
                <span className="text-xs text-muted-foreground">{t("Joined {{count}} workspace", { count: workspaces.length })}</span>
              </div>
            </div>
            {/* more operations */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={createWorkspace} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>{t("Create Workspace")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openPersonalSettings} className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>{t("Personal Settings")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Separator />
          <ScrollArea className="max-h-60 overflow-y-auto pb-1">
            <SortableList
              items={workspaces}
              onReorder={handleReorder}
              className="space-y-1"
              containerHeight={240}
              renderItem={(workspace) => (
                <div
                  key={workspace.id}
                  className={cn("flex flex-1 items-center gap-2 px-1 py-1 transition-colors group cursor-pointer")}
                  onClick={() => {
                    if (!isSwitching) {
                      switchWorkspace(workspace.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    {/* <div className="flex items-center justify-center h-8 w-8 rounded bg-gray-200 text-gray-700 text-xs font-medium">
                      {getWorkspaceInitial(workspace.name)}
                    </div> */}
                    <div className="flex flex-col flex-1">
                      <span className="text-sm truncate">{workspace.name}</span>
                      <span className="text-xs text-muted-foreground">Personal Workspace</span>
                    </div>
                    {currentWorkspace?.id === workspace.id && (
                      <div className="flex items-center justify-center h-4 w-4 rounded-full bg-gray-200">
                        <Check className="h-3 w-3 text-gray-600" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            />
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
