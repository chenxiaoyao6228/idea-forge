import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Layers, PlusIcon } from "lucide-react";
import useSubSpaceStore, { useAllSubspaces, useJoinedSubspaces, useFetchSubspaces } from "@/stores/subspace-store";
import useWorkspaceStore from "@/stores/workspace-store";
import { showCreateSubspaceModal } from "./create-subspace-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SubspaceJoinButton } from "@/pages/main/settings/subspace/subspace-join-button";
import { SubspaceType } from "@idea/contracts";
import { useSubspaceLabels } from "@/hooks/use-subspace-labels";
import { SubspaceIcon } from "@/components/subspace-icon";
interface AllSubspaceSheetProps {
  children: React.ReactNode;
}

export function AllSubspaceSheet({ children }: AllSubspaceSheetProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const { getSubspaceTypeShortLabel } = useSubspaceLabels();

  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const allSubspaces = useAllSubspaces();
  const joinedSubspaces = useJoinedSubspaces();
  const isCreating = useSubSpaceStore((state) => state.isCreating);
  const { run: fetchList } = useFetchSubspaces();
  const otherSubspaces = useMemo(() => {
    if (!allSubspaces) return [];
    const joinedIds = new Set(joinedSubspaces?.map((s) => s.id) || []);
    return allSubspaces.filter((s) => !joinedIds.has(s.id));
  }, [allSubspaces, joinedSubspaces]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="left" className="w-[400px] sm:w-[540px] flex flex-col h-full p-4 gap-1">
        <SheetHeader className="flex-shrink-0 pb-1">
          <SheetTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {t("All subspaces")}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1 custom-scrollbar">
          {/* My Subspaces Section */}
          <div className="mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">{t("Joined subspaces")}</h3>
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

            <div className="space-y-1">
              {joinedSubspaces && joinedSubspaces.length > 0 ? (
                joinedSubspaces.map((subspace) => (
                  <div key={subspace.id} className="flex items-center justify-between py-2 px-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {subspace.avatar ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={subspace.avatar} />
                          <AvatarFallback className="text-xs">
                            <SubspaceIcon type={subspace.type as SubspaceType} withBackground size="md" className="h-8 w-8" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <SubspaceIcon type={subspace.type as SubspaceType} withBackground size="md" className="h-8 w-8" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{subspace.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getSubspaceTypeShortLabel(subspace.type as SubspaceType)}</span>
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
                      {subspace.avatar ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={subspace.avatar} />
                          <AvatarFallback className="text-xs">
                            <SubspaceIcon type={subspace.type as SubspaceType} withBackground size="md" className="h-8 w-8" />
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <SubspaceIcon type={subspace.type as SubspaceType} withBackground size="md" className="h-8 w-8" />
                      )}
                      <div>
                        <div className="font-medium text-sm">{subspace.name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{getSubspaceTypeShortLabel(subspace.type as SubspaceType)}</span>
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
