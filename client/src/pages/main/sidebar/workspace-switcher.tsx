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
import useUserStore from "@/stores/user-store";
import useWorkspaceStore, { workspaceSelectors } from "@/stores/workspace";

export default function WorkspaceSwitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userInfo = useUserStore((state) => state.userInfo);

  const workspaces = useWorkspaceStore((state) => workspaceSelectors.selectAll(state));
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const fetchWorkspaces = useWorkspaceStore((state) => state.fetchList);
  const switchWorkspace = useWorkspaceStore((state) => state.switchWorkspace);
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
    const colors = ["#F0F4C3", "#B2EBF2", "#FFCCBC", "#D7CCC8", "#C5CAE9", "#FFE0B2", "#B2DFDB", "#F8BBD0", "#DCEDC8", "#E1BEE7"];
    const index = Math.floor(Math.random() * colors.length);
    return colors[index];
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
        <DropdownMenuContent align="start" className="w-64 px-2">
          <div className="flex-shrink-0  px-1 text-sm text-muted-foreground truncate h-9 leading-9">{userInfo?.displayName || userInfo?.email}</div>
          <Separator />
          <ScrollArea className="h-[260px] overflow-y-auto pb-1">
            {workspaces.map((workspace) => (
              <DropdownMenuItem
                key={workspace.id}
                className={cn("flex items-center h-9 my-2 cursor-pointer", currentWorkspace?.id === workspace.id && "bg-accent")}
                onClick={() => switchWorkspace(workspace.id)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="relative">
                    <Avatar className="h-6 w-6">
                      {workspace.avatar ? (
                        <AvatarImage src={workspace.avatar} alt={workspace.name} />
                      ) : (
                        <AvatarFallback style={{ backgroundColor: getWorkspaceColor() }}>{getWorkspaceInitial(workspace.name)}</AvatarFallback>
                      )}
                    </Avatar>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">{workspace.name}</span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
          <Separator />
          <DropdownMenuItem className="flex items-center py-1.5 cursor-pointer" onClick={createWorkspace}>
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{t("Create New Workspace")}</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
