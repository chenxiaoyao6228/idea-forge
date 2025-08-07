import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { X } from "lucide-react";
import { Subspace, SubspaceType } from "@idea/contracts";
import { subspaceApi } from "@/apis/subspace";
import useWorkspaceStore from "@/stores/workspace";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface SubspaceBatchSettingsProps {
  workspaceId: string;
}

export function SubspaceBatchSettings({ workspaceId }: SubspaceBatchSettingsProps) {
  const [selectedSubspaces, setSelectedSubspaces] = useState<MultiSelectOption[]>([]);
  const [subspaces, setSubspaces] = useState<Subspace[]>([]);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const batchSetWorkspaceWide = useWorkspaceStore((state) => state.batchSetWorkspaceWide);

  // Fetch subspaces
  useEffect(() => {
    const fetchSubspaces = async () => {
      try {
        const data = await subspaceApi.getUserSubspacesIncludingVirtual(workspaceId);
        // Filter out WORKSPACE_WIDE subspaces as they're already set
        const availableSubspaces = data.filter((subspace) => subspace.type !== SubspaceType.WORKSPACE_WIDE);
        setSubspaces(availableSubspaces);
      } catch (error) {
        console.error("Failed to fetch subspaces:", error);
        toast.error("Failed to load subspaces");
      }
    };

    fetchSubspaces();
  }, [workspaceId]);

  // Convert subspaces to MultiSelectOption format
  const subspaceOptions: MultiSelectOption[] = subspaces.map((subspace) => ({
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

      // Refresh subspaces list
      const data = await subspaceApi.getUserSubspacesIncludingVirtual(workspaceId);
      const availableSubspaces = data.filter((subspace) => subspace.type !== "WORKSPACE_WIDE");
      setSubspaces(availableSubspaces);
    } catch (error) {
      console.error("Failed to batch set workspace-wide:", error);
      toast.error("Failed to set subspaces as workspace-wide");
    } finally {
      setLoading(false);
    }
  };

  const renderSubspaceOption = (option: MultiSelectOption) => (
    <div className="flex items-center space-x-2">
      <span>{option.label}</span>
    </div>
  );

  const renderSubspaceBadge = (option: MultiSelectOption, onRemove: () => void) => (
    <div className="inline-flex items-center space-x-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
      <span>{option.label}</span>
      <button
        className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onRemove();
          }
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={onRemove}
      >
        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("All-member subspace")}</CardTitle>
        <CardDescription>
          {t("Batch manage setting subspaces as all-member subspaces, after setting, all space members will be automatically added to the subspace")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <MultiSelect
              options={subspaceOptions}
              selected={selectedSubspaces}
              onSelectionChange={setSelectedSubspaces}
              placeholder={t("Select subspace...")}
              searchPlaceholder={t("Search subspace...")}
              renderOption={renderSubspaceOption}
              renderBadge={renderSubspaceBadge}
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
