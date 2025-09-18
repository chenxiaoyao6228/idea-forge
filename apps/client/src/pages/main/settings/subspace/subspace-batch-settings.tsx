import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MultipleSelector, { Option } from "@/components/ui/multi-selector";
import { Subspace, SubspaceType } from "@idea/contracts";
import useWorkspaceStore from "@/stores/workspace";
import useSubSpaceStore from "@/stores/subspace";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface SubspaceBatchSettingsProps {
  workspaceId: string;
}

export function SubspaceBatchSettings({ workspaceId }: SubspaceBatchSettingsProps) {
  const [selectedSubspaces, setSelectedSubspaces] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const batchSetWorkspaceWide = useWorkspaceStore((state) => state.batchSetWorkspaceWide);
  const subspaces = useSubSpaceStore((state) => state.allSubspaces);
  const fetchList = useSubSpaceStore((state) => state.fetchList);

  // Convert subspaces to Option format
  const subspaceOptions: Option[] = subspaces.map((subspace) => ({
    value: subspace.id,
    label: subspace.name,
    type: subspace.type,
  }));

  const handleBatchSetWorkspaceWide = async () => {
    if (selectedSubspaces.length === 0) {
      toast.error("Please select at least one subspace");
      return;
    }

    setLoading(true);
    try {
      await batchSetWorkspaceWide(selectedSubspaces.map((s) => s.value));
      toast.success(`Successfully set ${selectedSubspaces.length} subspace(s) as workspace-wide`);
      setSelectedSubspaces([]);

      // Refresh subspaces list from store
      await fetchList(workspaceId);
    } catch (error) {
      console.error("Failed to batch set workspace-wide:", error);
      toast.error("Failed to set subspaces as workspace-wide");
    } finally {
      setLoading(false);
    }
  };

  const renderSubspaceOption = (option: Option) => (
    <div className="flex items-center space-x-2">
      <span>{option.label}</span>
    </div>
  );

  // Using default badge rendering from MultipleSelector

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Workspace-wide subspace")}</CardTitle>
        <CardDescription>
          {t("Batch manage setting subspaces as workspace-wide subspaces, after setting, all space members will be automatically added to the subspace")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <MultipleSelector
              options={subspaceOptions}
              value={selectedSubspaces}
              onChange={setSelectedSubspaces}
              placeholder={t("Select subspace...")}
              searchPlaceholder={t("Search subspace...")}
              renderOption={renderSubspaceOption}
            />
          </div>

          <Button onClick={handleBatchSetWorkspaceWide} disabled={selectedSubspaces.length === 0 || loading}>
            {loading ? t("Saving...") : t("Save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
