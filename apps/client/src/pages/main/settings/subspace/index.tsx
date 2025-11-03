import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@idea/ui/shadcn/ui/card';
import { Button } from '@idea/ui/shadcn/ui/button';
import { Separator } from '@idea/ui/shadcn/ui/separator';
import { HelpCircle, Plus } from "lucide-react";
import { SubspaceBatchSettings } from "./subspace-batch-settings";
import { WorkspaceSubspaceSettings } from "./workspace-subspace-settings";
import useWorkspaceStore from "@/stores/workspace-store";
import { SubspaceTable } from "./subspace-table";
import { MoreAboutSubspaceTip } from "./more-about-subspace-tip";
interface SubspaceProps {
  activeSubspaceId?: string;
}

export const Subspace = ({ activeSubspaceId }: SubspaceProps = {}) => {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const selectedSubspaceId = activeSubspaceId;

  if (!currentWorkspace) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">{t("Please select a workspace first")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pr-2">
        <h3 className="text-lg font-medium vertical-center">{t("Subspace")}</h3>
        <MoreAboutSubspaceTip />
      </div>
      <Separator />
      <div className="container mx-auto p-2">
        <div className="space-y-6">
          <SubspaceBatchSettings workspaceId={currentWorkspace.id} />

          {/* Subspace Settings Components */}
          <WorkspaceSubspaceSettings workspaceId={currentWorkspace.id} />

          <Separator />

          {/* Subspace Management */}
          <SubspaceTable workspaceId={currentWorkspace.id} selectedSubspaceId={selectedSubspaceId} />
        </div>
      </div>
    </div>
  );
};
