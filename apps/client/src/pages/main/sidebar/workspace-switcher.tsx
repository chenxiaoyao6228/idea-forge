import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, ChevronDown, MoreHorizontal, User, Check, Eye, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import useUserStore from "@/stores/user-store";
import { useAllWorkspaces, useCurrentWorkspace, useSwitchWorkspace, useReorderWorkspaces, useFetchWorkspaces } from "@/stores/workspace-store";
import { useAcceptGuestInvitation } from "@/stores/guest-collaborators-store";
import { useOtherWorkspacesTotalUnreadCount, useUnreadCountByWorkspace } from "@/stores/notification-store";
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
  const { run: fetchWorkspaces } = useFetchWorkspaces();
  const { run: acceptInvitation, loading: isAccepting } = useAcceptGuestInvitation();
  const unreadCountByWorkspace = useUnreadCountByWorkspace();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const otherWorkspacesTotalUnreadCount = useOtherWorkspacesTotalUnreadCount();

  // Check if other workspaces have high-priority unread notifications
  const hasOtherWorkspaceUnread = useMemo(() => {
    if (!unreadCountByWorkspace || !currentWorkspace) return false;

    // Check other workspaces for MENTIONS + INBOX notifications
    const otherWorkspaces = workspaces.filter((w) => w.id !== currentWorkspace.id);
    const hasOtherWorkspaceUnread = otherWorkspaces.some((workspace) => {
      const unread = unreadCountByWorkspace.byWorkspace[workspace.id];
      return unread && unread.MENTIONS + unread.INBOX > 0;
    });

    // Include cross-workspace INBOX notifications (workspace invitations)
    const hasCrossWorkspaceInbox = (unreadCountByWorkspace.crossWorkspace.INBOX || 0) > 0;

    return hasOtherWorkspaceUnread || hasCrossWorkspaceInbox;
  }, [workspaces, currentWorkspace, unreadCountByWorkspace]);

  const handleWorkspaceClick = async (workspace: any) => {
    if (isSwitching || isAccepting) return;

    // If it's a pending guest invitation, accept it first
    if (workspace.isPendingGuest && workspace.guestId) {
      try {
        await acceptInvitation(workspace.guestId);
        // Refresh workspace list to update status
        await fetchWorkspaces();
        // Then switch to the workspace
        await switchWorkspace(workspace.id);
      } catch (error) {
        console.error("Failed to accept invitation:", error);
      }
    } else {
      // Normal workspace switch
      await switchWorkspace(workspace.id);
    }
  };

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
    // Filter out guest workspaces from reordering
    const memberWorkspaces = reorderedWorkspaces.filter((w) => w.accessLevel !== "guest");
    if (memberWorkspaces.length === 0) return;

    // update the server
    try {
      await reorderWorkspaces(memberWorkspaces.map((w) => w.id));
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
              {otherWorkspacesTotalUnreadCount && otherWorkspacesTotalUnreadCount?.total > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-4 bg-red-500 text-white">
                  <span className="text-xs">{otherWorkspacesTotalUnreadCount?.total}</span>
                </Badge>
              )}
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
              renderItem={(workspace) => {
                // Calculate high-priority unread count for this workspace (MENTIONS + INBOX)
                const workspaceUnread = unreadCountByWorkspace?.byWorkspace[workspace.id];
                const hasUnread = workspaceUnread && workspaceUnread.MENTIONS + workspaceUnread.INBOX > 0;
                const unReadCount =
                  (workspaceUnread?.MENTIONS || 0) + (workspaceUnread?.INBOX || 0) + (workspaceUnread?.SHARING || 0) + (workspaceUnread?.SUBSCRIBE || 0);
                // Don't show badge for current workspace
                const showBadge = hasUnread && workspace.id !== currentWorkspace?.id;

                return (
                  <div
                    key={workspace.id}
                    className={cn(
                      "flex flex-1 items-center gap-2 px-1 py-1 transition-colors group cursor-pointer",
                      workspace.accessLevel === "guest" && "opacity-75",
                    )}
                    onClick={() => handleWorkspaceClick(workspace)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {/* <div className="flex items-center justify-center h-8 w-8 rounded bg-gray-200 text-gray-700 text-xs font-medium">
                        {getWorkspaceInitial(workspace.name)}
                      </div> */}
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm truncate">{workspace.name}</span>
                          {workspace.accessLevel === "guest" && workspace.isPendingGuest && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-4 bg-orange-100 text-orange-800">
                              <Clock className="h-3 w-3 mr-1" />
                              {t("Pending")}
                            </Badge>
                          )}
                          {workspace.accessLevel === "guest" && !workspace.isPendingGuest && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-4">
                              <Eye className="h-3 w-3 mr-1" />
                              {t("Guest")}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{t(workspace.type === "PERSONAL" ? "Personal Workspace" : "Team Workspace")}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* {showBadge && <div className="bg-red-500 rounded-full h-2 w-2" />} */}
                        {showBadge && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-4 bg-red-500 text-white">
                            <span className="text-xs">{unReadCount}</span>
                          </Badge>
                        )}
                        {currentWorkspace?.id === workspace.id && (
                          <div className="flex items-center justify-center h-4 w-4 rounded-full bg-gray-200">
                            <Check className="h-3 w-3 text-gray-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
