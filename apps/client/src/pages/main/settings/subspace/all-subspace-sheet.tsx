import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Layers, Users, Lock, Globe, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import useSubSpaceStore from "@/stores/subspace";
import useWorkspaceStore from "@/stores/workspace";
import { showCreateSubspaceModal } from "./create-subspace-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SubspaceJoinButton } from "@/pages/main/settings/subspace/subspace-join-button";
import { SubspaceType } from "@idea/contracts";
interface AllSubspaceSheetProps {
  children: React.ReactNode;
}

export function AllSubspaceSheet({ children }: AllSubspaceSheetProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const allSubspaces = useSubSpaceStore((state) => state.allSubspaces);
  const joinedSubspaces = useSubSpaceStore((state) => state.joinedSubspaces);
  const isCreating = useSubSpaceStore((state) => state.isCreating);
  const fetchList = useSubSpaceStore((state) => state.fetchList);
  const otherSubspaces = useMemo(() => {
    if (!allSubspaces) return [];
    const joinedIds = new Set(joinedSubspaces?.map((s) => s.id) || []);
    return allSubspaces.filter((s) => !joinedIds.has(s.id));
  }, [allSubspaces, joinedSubspaces]);

  const getSubspaceIcon = (type: string) => {
    switch (type) {
      case "PUBLIC":
        return <Globe className="h-4 w-4" />;
      case "WORKSPACE_WIDE":
        return <Users className="h-4 w-4" />;
      case "INVITE_ONLY":
        return <Lock className="h-4 w-4" />;
      case "PRIVATE":
        return <Lock className="h-4 w-4" />;
      default:
        return <Layers className="h-4 w-4" />;
    }
  };

  const getSubspaceTypeLabel = (type: string) => {
    switch (type) {
      case "PUBLIC":
        return t("Public");
      case "WORKSPACE_WIDE":
        return t("Workspace-wide");
      case "INVITE_ONLY":
        return t("Invite only");
      case "PRIVATE":
        return t("Private");
      default:
        return type;
    }
  };

  const getSubspaceInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] flex flex-col h-full ">
        <SheetHeader className="flex-shrink-0 pb-1">
          <SheetTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {t("All subspaces")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* My Subspaces Section */}
          <div className="">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">{t("My subspaces")}</h3>
              <div className="ml-1 flex items-center gap-1 invisible group-hover/label:visible">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 cursor-pointer hover:bg-accent/50 dark:hover:bg-accent/25"
                  disabled={isCreating}
                  onClick={() => {
                    if (currentWorkspace?.id) {
                      showCreateSubspaceModal({ workspaceId: currentWorkspace.id });
                    }
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              {joinedSubspaces && joinedSubspaces.length > 0 ? (
                joinedSubspaces.map((subspace) => (
                  <div key={subspace.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={subspace.avatar || undefined} />
                        <AvatarFallback className="text-xs">{getSubspaceInitials(subspace.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{subspace.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getSubspaceIcon(subspace.type)}
                          <span>{getSubspaceTypeLabel(subspace.type)}</span>
                          <span>•</span>
                          <span>
                            {subspace.memberCount || 0} {t("members")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {t("Joined")}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">{t("No subspaces joined yet")}</div>
              )}
            </div>
          </div>

          {/* Other Subspaces Section */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">{t("Other subspaces")}</h3>

            <div className="space-y-2">
              {otherSubspaces && otherSubspaces.length > 0 ? (
                otherSubspaces.map((subspace) => (
                  <div key={subspace.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={subspace.avatar || undefined} />
                        <AvatarFallback className="text-xs">{getSubspaceInitials(subspace.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{subspace.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getSubspaceIcon(subspace.type)}
                          <span>{getSubspaceTypeLabel(subspace.type)}</span>
                          <span>•</span>
                          <span>
                            {subspace.memberCount || 0} {t("members")}
                          </span>
                        </div>
                        {subspace.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{subspace.description}</div>}
                      </div>
                    </div>
                    <SubspaceJoinButton
                      subspaceId={subspace.id}
                      subspaceType={subspace.type as SubspaceType}
                      isUserMember={false}
                      onJoinSuccess={async () => {
                        // Refresh the subspace list to update the UI
                        if (currentWorkspace?.id) {
                          await fetchList(currentWorkspace.id);
                        }
                      }}
                    />
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground py-4 text-center">{t("No other subspaces available")}</div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
