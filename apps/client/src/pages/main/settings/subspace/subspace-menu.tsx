import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TooltipWrapper } from "@/components/tooltip-wrapper";
import { MoreHorizontal, UserPlus, Settings, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { showAddSubspaceMemberModal } from "@/pages/main/settings/subspace/add-subspace-member-modal";
import { showSubspaceSettingsModal } from "@/pages/main/settings/subspace/subspace-setting-modal/subspace-settings-modal";
import useSubspaceStore, { useLeaveSubspace, useIsLastSubspaceAdmin } from "@/stores/subspace";

interface SubspaceMenuProps {
  subspaceId: string;
  subspaceName: string;
  subspaceType: string;
  workspaceId: string;
}

export function SubspaceMenu({ subspaceId, subspaceName, subspaceType, workspaceId }: SubspaceMenuProps) {
  const { t } = useTranslation();
  const { run: leaveSubspace, loading: isLeavingSubspace } = useLeaveSubspace();
  const isLastAdmin = useIsLastSubspaceAdmin(subspaceId);

  const handleAddMembers = async () => {
    const result = await showAddSubspaceMemberModal({
      subspaceId,
      subspaceName,
      workspaceId,
    });

    if (result?.success) {
      console.log("Members added successfully:", result);
    }
  };

  const handleSubspaceSettings = async () => {
    const result = await showSubspaceSettingsModal({
      subspaceId,
      workspaceId,
    });

    if (result) {
      // Refresh subspace data
      await useSubspaceStore.getState().fetchSubspace(subspaceId);
    }
  };

  const handleLeaveSubspace = async () => {
    try {
      await leaveSubspace({
        subspaceId,
      });
    } catch (error) {
      // Error is already handled by the hook (toast shown)
      // Component can add additional error handling if needed
    }
  };

  const handleArchiveSubspace = () => {
    // TODO: Implement archive subspace
    console.log("Archive subspace clicked");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleAddMembers}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t("Add member...")}
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleSubspaceSettings}>
          <Settings className="mr-2 h-4 w-4" />
          {t("Subspace settings...")}
        </DropdownMenuItem>
        <TooltipWrapper disabled={isLastAdmin} tooltip={t("Cannot leave as the only admin")}>
          <DropdownMenuItem onClick={handleLeaveSubspace} disabled={isLeavingSubspace || isLastAdmin}>
            <LogOut className="mr-2 h-4 w-4" />
            {isLeavingSubspace ? t("Leaving...") : t("Leave subspace")}
          </DropdownMenuItem>
        </TooltipWrapper>

        {/* <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem onClick={handleArchiveSubspace}>
                <Archive className="mr-2 h-4 w-4" />
                {t("Archive subspace")}
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="right">{t("Archive this subspace. Settings and pages will become read-only.")}</TooltipContent>
          </Tooltip>
        </TooltipProvider> */}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
