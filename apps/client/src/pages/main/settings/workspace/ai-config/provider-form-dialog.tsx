import React, { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import useRequest from "@ahooksjs/use-request";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@idea/ui/shadcn/ui/dialog";
import { Input } from "@idea/ui/shadcn/ui/input";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Label } from "@idea/ui/shadcn/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@idea/ui/shadcn/ui/select";
import { Switch } from "@idea/ui/shadcn/ui/switch";
import {
  CreateWorkspaceAIProviderBodySchema,
  LLMProviderType,
  type CreateWorkspaceAIProviderBody,
  type WorkspaceAIProvider,
  PROVIDER_REGISTRY,
  parseModelsString,
} from "@idea/contracts";
import { LLM_PROVIDERS, getProviderMetadata, providerRequiresApiKey, getProviderDefaultBaseURL } from "@/lib/ai-providers";
import { workspaceApi } from "@/apis/workspace";
import { ErrorList } from "@/components/forms";
import MultipleSelector, { type Option } from "@/components/ui/multi-selector";

interface ProviderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  editingProvider?: WorkspaceAIProvider | null;
  onSuccess?: () => void;
}

// Form data type (without workspaceId since it's passed from parent)
type ProviderFormData = CreateWorkspaceAIProviderBody;

export function ProviderFormDialog({ open, onOpenChange, workspaceId, editingProvider, onSuccess }: ProviderFormDialogProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProviderFormData>({
    resolver: zodResolver(CreateWorkspaceAIProviderBodySchema),
    defaultValues: {
      provider: LLMProviderType.OPENAI,
      name: null,
      apiKey: "",
      baseURL: null,
      models: null,
      isActive: true,
      priority: 0,
    },
  });

  const modelsValue = watch("models");
  const selectedProvider = watch("provider");
  const providerMetadata = getProviderMetadata(selectedProvider);
  const requiresApiKey = providerRequiresApiKey(selectedProvider);

  // Convert preset models to Option format for MultipleSelector
  const presetModelOptions: Option[] = useMemo(() => {
    const presets = PROVIDER_REGISTRY[selectedProvider]?.presetModels || [];
    return presets.map((model) => ({ value: model, label: model }));
  }, [selectedProvider]);

  // Convert current models value to Option format
  const selectedModelOptions: Option[] = useMemo(() => {
    const models = parseModelsString(modelsValue);
    return models.map((model) => ({ value: model, label: model }));
  }, [modelsValue]);

  // Handle model selection changes
  const handleModelsChange = (options: Option[]) => {
    const modelsString = options.map((o) => o.value).join(",") || null;
    setValue("models", modelsString);
  };

  // Load editing data
  useEffect(() => {
    if (editingProvider) {
      reset({
        provider: editingProvider.provider as LLMProviderType,
        name: editingProvider.name,
        apiKey: editingProvider.apiKey,
        baseURL: editingProvider.baseURL,
        models: editingProvider.models,
        isActive: editingProvider.isActive,
        priority: editingProvider.priority,
      });
    } else {
      reset({
        provider: LLMProviderType.OPENAI,
        name: null,
        apiKey: "",
        baseURL: null,
        models: null,
        isActive: true,
        priority: 0,
      });
    }
  }, [editingProvider, reset]);

  // Clear name and baseURL when provider changes
  useEffect(() => {
    if (!editingProvider) {
      setValue("name", null);
      setValue("baseURL", null);
    }
  }, [selectedProvider, editingProvider, setValue]);

  const { run: createProvider, loading: isCreating } = useRequest(
    async (data: ProviderFormData) => {
      return workspaceApi.createAIProvider(workspaceId, data);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t("AI provider created"));
        onOpenChange(false);
        reset();
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(error.message || t("Failed to create AI provider"));
      },
    },
  );

  const { run: updateProvider, loading: isUpdating } = useRequest(
    async (data: ProviderFormData) => {
      if (!editingProvider?.id) throw new Error("No provider to update");
      return workspaceApi.updateAIProvider(workspaceId, editingProvider.id, data);
    },
    {
      manual: true,
      onSuccess: () => {
        toast.success(t("AI provider updated"));
        onOpenChange(false);
        reset();
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(error.message || t("Failed to update AI provider"));
      },
    },
  );

  const onSubmit = (data: ProviderFormData) => {
    if (editingProvider) {
      updateProvider(data);
    } else {
      createProvider(data);
    }
  };

  const isLoading = isCreating || isUpdating;
  const defaultBaseURL = getProviderDefaultBaseURL(selectedProvider);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingProvider ? t("Edit AI Provider") : t("Add AI Provider")}</DialogTitle>
          <DialogDescription>{t("Configure API credentials for an AI provider")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Provider Type")}</Label>
            <Controller
              name="provider"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={!!editingProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("Select a provider")} />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDERS.map((provider) => (
                      <SelectItem key={provider.value} value={provider.value}>
                        {provider.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {editingProvider && <p className="text-[0.8rem] text-muted-foreground">{t("Provider type cannot be changed after creation")}</p>}
            <ErrorList errors={errors.provider?.message ? [errors.provider.message] : []} />
          </div>

          {requiresApiKey && (
            <div className="space-y-2">
              <Label>{t("API Key")}</Label>
              <Input {...register("apiKey")} type="password" placeholder={t("Enter your API key")} />
              <p className="text-[0.8rem] text-muted-foreground">{t("Your API key will be encrypted and stored securely")}</p>
              <ErrorList errors={errors.apiKey?.message ? [errors.apiKey.message] : []} />
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("Base URL (Optional)")}</Label>
            <Input {...register("baseURL")} placeholder={providerMetadata?.baseUrlPlaceholder || defaultBaseURL} />
            <p className="text-[0.8rem] text-muted-foreground">
              {defaultBaseURL ? (
                <>
                  {t("Leave empty to use the default endpoint:")} {defaultBaseURL}
                </>
              ) : (
                t("Custom API endpoint URL")
              )}
            </p>
            <ErrorList errors={errors.baseURL?.message ? [errors.baseURL.message] : []} />
          </div>

          {/* Models field */}
          <div className="space-y-2">
            <Label>{t("Models")}</Label>
            <MultipleSelector
              value={selectedModelOptions}
              onChange={handleModelsChange}
              defaultOptions={presetModelOptions}
              placeholder={t("Select or type models...")}
              creatable
              emptyIndicator={<p className="text-center text-sm text-muted-foreground py-2">{t("No preset models. Type to add custom model IDs.")}</p>}
              hideClearAllButton={selectedModelOptions.length === 0}
            />
            <p className="text-[0.8rem] text-muted-foreground">{t("Select from presets or type custom model IDs. Leave empty to allow any model.")}</p>
            <ErrorList errors={errors.models?.message ? [errors.models.message] : []} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("Priority")}</Label>
              <Input {...register("priority", { valueAsNumber: true })} type="number" min="0" />
              <p className="text-[0.8rem] text-muted-foreground">{t("Lower number = higher priority (tried first)")}</p>
              <ErrorList errors={errors.priority?.message ? [errors.priority.message] : []} />
            </div>

            <div className="space-y-2">
              <Label>{t("Active")}</Label>
              <div className="pt-2">
                <Controller name="isActive" control={control} render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />} />
              </div>
              <p className="text-[0.8rem] text-muted-foreground">{t("Enable or disable this provider")}</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              {t("Cancel")}
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("Saving...") : editingProvider ? t("Update") : t("Create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
