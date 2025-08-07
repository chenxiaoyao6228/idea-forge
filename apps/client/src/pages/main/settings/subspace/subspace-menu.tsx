import React from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserPlus, Settings, Copy, LogOut, Archive } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AddSubspaceMemberDialog } from "./add-subspace-member-dialog";

interface SubspaceMenuProps {
  subspaceId: string;
  subspaceName: string;
  subspaceType: string;
  workspaceId: string;
}

export function SubspaceMenu({ subspaceId, subspaceName, subspaceType, workspaceId }: SubspaceMenuProps) {
  const { t } = useTranslation();

  const handleSubspaceSettings = () => {
    // TODO: Implement subspace settings
    console.log("Subspace settings clicked");
  };

  const handleCopySubspace = () => {
    // TODO: Implement copy subspace
    console.log("Copy subspace clicked");
  };

  const handleLeaveSubspace = () => {
    // TODO: Implement leave subspace
    console.log("Leave subspace clicked");
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
        <DropdownMenuItem onClick={handleCopySubspace}>
          <Copy className="mr-2 h-4 w-4" />
          {t("Copy subspace")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLeaveSubspace}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("Leave subspace")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleArchiveSubspace}>
          <Archive className="mr-2 h-4 w-4" />
          {t("Archive subspace")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
