import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Plus, Settings2, Trash2, Power, PowerOff, GripVertical, Server } from "lucide-react";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@idea/ui/shadcn/ui/card";
import { Badge } from "@idea/ui/shadcn/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@idea/ui/shadcn/ui/alert-dialog";
import { Separator } from "@idea/ui/shadcn/ui/separator";
import useWorkspaceStore from "@/stores/workspace-store";
import { useWorkspacePermissions } from "@/hooks/permissions";
import { workspaceApi } from "@/apis/workspace";
import useRequest from "@ahooksjs/use-request";
import type { WorkspaceAIProvider, PublicWorkspaceAIProvider } from "@idea/contracts";
import { parseModelsString } from "@idea/contracts";
import { getProviderLabel } from "@/lib/ai-providers";
import { ProviderFormDialog } from "./provider-form-dialog";

export function AIConfigSettings() {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const workspaceId = currentWorkspace?.id;
  const { canEditWorkspace } = useWorkspacePermissions(workspaceId);

  // Provider state
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<WorkspaceAIProvider | null>(null);
  const [deleteProviderDialogOpen, setDeleteProviderDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<PublicWorkspaceAIProvider | null>(null);

  // Fetch AI configuration summary
  const {
    data: summary,
    loading: isLoading,
    refresh,
  } = useRequest(
    async () => {
      if (!workspaceId || !canEditWorkspace) return { providers: [], availableModels: [] };
      return workspaceApi.getAIConfigSummary(workspaceId);
    },
    {
      refreshDeps: [workspaceId, canEditWorkspace],
    },
  );

  // Fetch providers with API keys for editing
  const { run: fetchProviderForEdit, loading: isFetchingProvider } = useRequest(
    async (providerId: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return workspaceApi.getAIProviderById(workspaceId, providerId);
    },
    {
      manual: true,
      onSuccess: (provider) => {
        setEditingProvider(provider);
        setProviderDialogOpen(true);
      },
      onError: (error: any) => {
        toast.error(error.message || t("Failed to load provider"));
      },
    },
  );

  // Delete provider mutation
  const { run: deleteProvider, loading: isDeletingProvider } = useRequest(
    async (providerId: string) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return workspaceApi.deleteAIProvider(workspaceId, providerId);
    },
    {
      manual: true,
      onSuccess: () => {
        refresh();
        toast.success(t("AI provider deleted"));
        setDeleteProviderDialogOpen(false);
        setProviderToDelete(null);
      },
      onError: (error: any) => {
        toast.error(error.message || t("Failed to delete AI provider"));
      },
    },
  );

  // Toggle provider active mutation
  const { run: toggleProviderActive, loading: isTogglingProvider } = useRequest(
    async ({ providerId, isActive }: { providerId: string; isActive: boolean }) => {
      if (!workspaceId) throw new Error("No workspace selected");
      return workspaceApi.updateAIProvider(workspaceId, providerId, { isActive });
    },
    {
      manual: true,
      onSuccess: () => {
        refresh();
        toast.success(t("AI provider updated"));
      },
      onError: (error: any) => {
        toast.error(error.message || t("Failed to update AI provider"));
      },
    },
  );

  // Provider handlers
  const handleEditProvider = (provider: PublicWorkspaceAIProvider) => {
    if (!provider.id) return;
    fetchProviderForEdit(provider.id);
  };

  const handleAddProvider = () => {
    setEditingProvider(null);
    setProviderDialogOpen(true);
  };

  const handleDeleteProvider = (provider: PublicWorkspaceAIProvider) => {
    setProviderToDelete(provider);
    setDeleteProviderDialogOpen(true);
  };

  const confirmDeleteProvider = () => {
    if (providerToDelete?.id) {
      deleteProvider(providerToDelete.id);
    }
  };

  const handleToggleProviderActive = (provider: PublicWorkspaceAIProvider) => {
    if (!provider.id) return;
    toggleProviderActive({
      providerId: provider.id,
      isActive: !provider.isActive,
    });
  };

  if (!canEditWorkspace) {
    return <div className="p-6 text-center text-muted-foreground">{t("You don't have permission to manage AI settings")}</div>;
  }

  const providers = summary?.providers || [];
  const availableModels = summary?.availableModels || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium">{t("AI Configuration")}</h3>
        <p className="text-sm text-muted-foreground">{t("Configure AI providers and models for your workspace")}</p>
      </div>

      <Separator />

      {/* Providers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                {t("AI Providers")}
              </CardTitle>
              <CardDescription>{t("Configure API credentials for each provider. Lower priority providers are tried first.")}</CardDescription>
            </div>
            <Button onClick={handleAddProvider} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t("Add Provider")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">{t("Loading...")}</div>
          ) : providers.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>{t("No AI providers configured")}</p>
              <p className="text-sm mt-2">{t("Add a provider to enable AI features in your workspace")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {providers.map((provider, index) => {
                const models = parseModelsString(provider.models);
                return (
                  <div key={provider.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GripVertical className="h-4 w-4 cursor-move" />
                        <span className="text-sm font-medium w-6 text-center">{index + 1}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{provider.name || getProviderLabel(provider.provider)}</h4>
                          {provider.name && (
                            <Badge variant="outline" className="text-xs">
                              {getProviderLabel(provider.provider)}
                            </Badge>
                          )}
                          {provider.isActive ? (
                            <Badge variant="default" className="text-xs">
                              {t("Active")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              {t("Inactive")}
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">{provider.baseURL ? provider.baseURL : t("Using default endpoint")}</div>
                        {models.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {models.slice(0, 5).map((model) => (
                              <Badge key={model} variant="secondary" className="text-xs">
                                {model}
                              </Badge>
                            ))}
                            {models.length > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{models.length - 5} more
                              </Badge>
                            )}
                          </div>
                        )}
                        {models.length === 0 && <div className="text-xs text-muted-foreground/60 mt-1">{t("No models specified (serves any model)")}</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleToggleProviderActive(provider)} disabled={isTogglingProvider}>
                        {provider.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditProvider(provider)} disabled={isFetchingProvider}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProvider(provider)} disabled={isDeletingProvider}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Models Summary */}
      {availableModels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("Available Models")}</CardTitle>
            <CardDescription>{t("All models your configured providers can serve")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableModels.slice(0, 20).map((modelId) => (
                <Badge key={modelId} variant="outline" className="text-xs">
                  {modelId}
                </Badge>
              ))}
              {availableModels.length > 20 && (
                <Badge variant="outline" className="text-xs">
                  +{availableModels.length - 20} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>{t("How AI providers work")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• {t("Each provider can be configured with a list of models it can serve")}</p>
          <p>• {t("When a model is requested, the system finds all providers that can serve it")}</p>
          <p>• {t("Providers are tried in order of priority (lower number = higher priority)")}</p>
          <p>• {t("If one provider fails, the system automatically falls back to the next")}</p>
          <p>• {t("If no models are specified for a provider, it can serve any model")}</p>
        </CardContent>
      </Card>

      {/* Provider Form Dialog */}
      {workspaceId && (
        <ProviderFormDialog
          open={providerDialogOpen}
          onOpenChange={(open) => {
            setProviderDialogOpen(open);
            if (!open) setEditingProvider(null);
          }}
          workspaceId={workspaceId}
          editingProvider={editingProvider}
          onSuccess={refresh}
        />
      )}

      {/* Delete Provider Confirmation Dialog */}
      <AlertDialog open={deleteProviderDialogOpen} onOpenChange={setDeleteProviderDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete AI Provider")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Are you sure you want to delete "{{name}}"? This action cannot be undone.', {
                name: providerToDelete?.name || (providerToDelete ? getProviderLabel(providerToDelete.provider) : ""),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProvider} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
