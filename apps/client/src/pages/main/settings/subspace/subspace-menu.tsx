import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserPlus, Settings, Copy, LogOut, Archive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AddSubspaceMemberDialog } from "./add-subspace-member-dialog";
import useSubspaceStore from "@/stores/subspace";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SubspaceMenuProps {
  subspaceId: string;
  subspaceName: string;
  subspaceType: string;
  workspaceId: string;
}

export function SubspaceMenu({ subspaceId, subspaceName, subspaceType, workspaceId }: SubspaceMenuProps) {
  const { t } = useTranslation();
  const leaveSubspace = useSubspaceStore((state) => state.leaveSubspace);

  const handleSubspaceSettings = () => {
    // TODO: Implement subspace settings
    console.log("Subspace settings clicked");
  };

  const handleCopySubspace = () => {
    // TODO: Implement copy subspace
    console.log("Copy subspace clicked");
  };

  const handleLeaveSubspace = () => {
    leaveSubspace(subspaceId);
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
        <AddSubspaceMemberDialog subspaceId={subspaceId} subspaceName={subspaceName} subspaceType={subspaceType} workspaceId={workspaceId}>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t("Add member...")}
          </DropdownMenuItem>
        </AddSubspaceMemberDialog>

        <DropdownMenuItem onClick={handleSubspaceSettings}>
          <Settings className="mr-2 h-4 w-4" />
          {t("Subspace settings...")}
        </DropdownMenuItem>
        {/* <DropdownMenuItem onClick={handleCopySubspace}>
          <Copy className="mr-2 h-4 w-4" />
          {t("Copy subspace")}
        </DropdownMenuItem> */}
        <DropdownMenuItem onClick={handleLeaveSubspace}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("Leave subspace")}
        </DropdownMenuItem>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuItem onClick={handleArchiveSubspace}>
                <Archive className="mr-2 h-4 w-4" />
                {t("Archive subspace")}
              </DropdownMenuItem>
            </TooltipTrigger>
            <TooltipContent side="right">{t("Archive this subspace. Settings and pages will become read-only.")}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
