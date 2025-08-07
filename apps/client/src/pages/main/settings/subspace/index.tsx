import React from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HelpCircle, Plus } from "lucide-react";
import { SubspaceBatchSettings } from "./subspace-batch-settings";
import { WorkspaceSubspaceSettings } from "./workspace-subspace-settings";
import useWorkspaceStore from "@/stores/workspace";
import { SubspaceTable } from "./subspace-table";

export const Subspace = () => {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);

  if (!currentWorkspace) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">{t("请先选择一个工作空间")}</p>
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
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          {t("Learn about subspaces")}
        </Button>
      </div>
      <Separator />
      <div className="container mx-auto p-2">
        <div className="space-y-6">
          <SubspaceBatchSettings workspaceId={currentWorkspace.id} />

          {/* Subspace Settings Components */}
          <WorkspaceSubspaceSettings workspaceId={currentWorkspace.id} />

          <Separator />

          {/* Subspace Management */}
          <SubspaceTable workspaceId={currentWorkspace.id} />
        </div>
      </div>
    </div>
  );
};
