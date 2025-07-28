import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import useUserStore from "@/stores/user";
import useWorkspaceStore, { workspaceSelectors } from "@/stores/workspace";
import { SortableList } from "@/components/sortable-list";

export default function WorkspaceSwitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userInfo = useUserStore((state) => state.userInfo);

  const workspaces = useWorkspaceStore((state) => workspaceSelectors.selectAll(state));
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchList);
  const switchWorkspace = useWorkspaceStore((state) => state.switchWorkspace);
  const reorderWorkspaces = useWorkspaceStore((state) => state.reorderWorkspaces);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const createWorkspace = async () => {
    navigate("/create-workspace");
    setIsDropdownOpen(false);
  };

  const getWorkspaceInitial = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "W";
  };

  const getWorkspaceColor = () => {
    return "#B2EBF2";
    // const colors = ["#F0F4C3", "#B2EBF2", "#FFCCBC", "#D7CCC8", "#C5CAE9", "#FFE0B2", "#B2DFDB", "#F8BBD0", "#DCEDC8", "#E1BEE7"];
    // const index = Math.floor(Math.random() * colors.length);
    // return colors[index];
  };

  const handleReorder = async (reorderedWorkspaces: typeof workspaces) => {
    // optimistic update to avoid bounce back effect
    useWorkspaceStore.getState().setAll(reorderedWorkspaces);
    // update the server
    reorderWorkspaces(reorderedWorkspaces.map((w) => w.id));
  };

  if (!currentWorkspace) {
    return null;
  }

  return (
    <div className="flex flex-col justify-center flex-shrink-0 border-b">
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="w-full justify-between px-2 py-1.5 h-auto hover:bg-accent overflow-x-hidden ">
            <div className="flex items-center space-x-2 truncate">
              <div className="relative">
                <Avatar className="h-6 w-6">
                  {currentWorkspace?.avatar ? (
                    <AvatarImage src={currentWorkspace.avatar} alt={currentWorkspace.name} />
                  ) : (
                    <AvatarFallback style={{ backgroundColor: getWorkspaceColor() }}>{getWorkspaceInitial(currentWorkspace?.name || "")}</AvatarFallback>
                  )}
                </Avatar>
              </div>
              <span className="text-sm font-medium truncate">{currentWorkspace?.name || t("Workspace")}</span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72 py-2 rounded-xl shadow-lg border bg-white">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                {userInfo?.imageUrl ? (
                  <AvatarImage src={userInfo.imageUrl} alt={userInfo.displayName || userInfo.email} />
                ) : (
                  <AvatarFallback style={{ backgroundColor: "#FFB6C1" }}>{getWorkspaceInitial(userInfo?.displayName || "")}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userInfo?.displayName || userInfo?.email}</span>
                <span className="text-xs text-muted-foreground">已加入{workspaces.length}个空间</span>
              </div>
            </div>
            {/* <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <span className="text-xs">⋯</span>
            </Button> */}
          </div>
          <Separator />
          <ScrollArea className="max-h-60 overflow-y-auto pb-1">
            <SortableList
              items={workspaces}
              onReorder={handleReorder}
              className="space-y-2"
              containerHeight={240}
              renderItem={(workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  className={cn("flex flex-1 items-center gap-3 px-2 py-2 transition-colors group cursor-pointer")}
                  onClick={() => switchWorkspace(workspace.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    {/* <div className="flex items-center justify-center h-5 w-5 rounded bg-red-500 text-white text-xs font-medium">
                      {getWorkspaceInitial(workspace.name)}
                    </div> */}
                    <div className="flex flex-col flex-1">
                      <span className="text-sm truncate">{workspace.name}</span>
                      {/* <span className="text-xs text-muted-foreground">个人免费版空间</span> */}
                    </div>
                    {currentWorkspace?.id === workspace.id && (
                      <div className="flex items-center justify-center h-4 w-4 rounded-full bg-gray-200">
                        <svg className="h-3 w-3 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              )}
            />
          </ScrollArea>
          <Separator />
          <DropdownMenuItem className="flex items-center py-2 cursor-pointer" onClick={createWorkspace}>
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm truncate">{t("Create New Workspace")}</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
