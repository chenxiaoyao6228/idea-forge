import React, { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Input } from "@idea/ui/shadcn/ui/input";
import { Label } from "@idea/ui/shadcn/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@idea/ui/shadcn/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@idea/ui/shadcn/ui/avatar";
import { Separator } from "@idea/ui/shadcn/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@idea/ui/shadcn/ui/tooltip";
import { ImageCropper } from "@/components/image-cropper";
import useWorkspaceStore, { useUpdateWorkspace, useLeaveWorkspace } from "@/stores/workspace-store";
import { useFileUpload } from "@/hooks/use-file-upload";
import { dataURLtoFile } from "@/lib/file";
import { type UpdateWorkspaceRequest, type WorkspaceSettings } from "@idea/contracts";
import { useWorkspacePermissions } from "@/hooks/permissions";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Switch } from "@idea/ui/shadcn/ui/switch";

interface FileWithPreview extends File {
  preview: string;
  path?: string;
}

// Timezone options (major timezones)
const TIMEZONE_OPTIONS = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Kolkata", label: "India (IST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
];

// Date format options
const DATE_FORMAT_OPTIONS = [
  { value: "YYYY/MM/DD", label: "2025/01/15", description: "Year/Month/Day" },
  { value: "MM/DD/YYYY", label: "01/15/2025", description: "Month/Day/Year (US)" },
  { value: "DD/MM/YYYY", label: "15/01/2025", description: "Day/Month/Year (EU)" },
  { value: "YYYY-MM-DD", label: "2025-01-15", description: "ISO format" },
  { value: "DD-MM-YYYY", label: "15-01-2025", description: "Day-Month-Year" },
  { value: "MM-DD-YYYY", label: "01-15-2025", description: "Month-Day-Year" },
];

export const Workspace = () => {
  const { t } = useTranslation();
  const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
  const { run: updateWorkspace, loading: isUpdatingWorkspace } = useUpdateWorkspace();
  const { run: leaveWorkspace } = useLeaveWorkspace();
  const workspaceId = currentWorkspace?.id;
  const { canEditWorkspace } = useWorkspacePermissions(workspaceId);

  // Form states
  const [workspaceName, setWorkspaceName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Avatar upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropperDialogOpen, setCropperDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);

  // Use the new file upload hook with 'user' context (for workspace avatars)
  const { upload, uploading: isUploading } = useFileUpload({ context: "user" });

  // Settings states
  const [timezone, setTimezone] = useState<string>("");
  const [dateFormat, setDateFormat] = useState<string>("");

  // Initialize form with current workspace data
  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name || "");

      // Parse settings if they exist
      const settings = currentWorkspace.settings as WorkspaceSettings | null;
      if (settings) {
        setTimezone(settings.timezone || "");
        setDateFormat(settings.dateFormat || "YYYY/MM/DD");
      } else {
        // Default values
        setTimezone("UTC");
        setDateFormat("YYYY/MM/DD");
      }
    }
  }, [currentWorkspace]);

  // Update workspace name
  const handleNameUpdate = useCallback(
    async (e: React.FocusEvent<HTMLInputElement>) => {
      if (!currentWorkspace || !canEditWorkspace) return;
      const newName = e.target.value.trim();
      if (!newName || newName === currentWorkspace.name) return;

      try {
        setIsUpdating(true);
        const updateData: UpdateWorkspaceRequest = {
          name: newName,
          description: currentWorkspace.description || null,
          avatar: currentWorkspace.avatar || null,
          memberSubspaceCreate: currentWorkspace.memberSubspaceCreate ?? false,
          settings: currentWorkspace.settings as WorkspaceSettings,
        };

        await updateWorkspace({ workspaceId: currentWorkspace.id, workspace: updateData });
        toast.success(t("Workspace name updated successfully"));
      } catch (error) {
        console.error("Failed to update workspace name:", error);
        toast.error(t("Failed to update workspace name"));
        // Reset the input value on error
        setWorkspaceName(currentWorkspace.name);
      } finally {
        setIsUpdating(false);
      }
    },
    [currentWorkspace, t, canEditWorkspace],
  );

  // Update workspace settings
  const handleSettingsUpdate = useCallback(
    async (newSettings: Partial<WorkspaceSettings>) => {
      if (!currentWorkspace || !canEditWorkspace) return;

      try {
        setIsUpdating(true);
        const currentSettings = (currentWorkspace.settings as WorkspaceSettings) || {};
        const updatedSettings: WorkspaceSettings = {
          ...currentSettings,
          ...newSettings,
        };

        const updateData: UpdateWorkspaceRequest = {
          name: currentWorkspace.name,
          description: currentWorkspace.description || null,
          avatar: currentWorkspace.avatar || null,
          memberSubspaceCreate: currentWorkspace.memberSubspaceCreate ?? false,
          settings: updatedSettings,
        };

        await updateWorkspace({ workspaceId: currentWorkspace.id, workspace: updateData });
        toast.success(t("Settings updated successfully"));
      } catch (error) {
        console.error("Failed to update settings:", error);
        toast.error(t("Failed to update settings"));
      } finally {
        setIsUpdating(false);
      }
    },
    [currentWorkspace, t, canEditWorkspace],
  );

  // Handle timezone change
  const handleTimezoneChange = useCallback(
    (newTimezone: string) => {
      if (!canEditWorkspace) return;
      setTimezone(newTimezone);
      handleSettingsUpdate({ timezone: newTimezone });
    },
    [handleSettingsUpdate, canEditWorkspace],
  );

  // Handle date format change
  const handleDateFormatChange = useCallback(
    (newDateFormat: string) => {
      if (!canEditWorkspace) return;
      setDateFormat(newDateFormat);
      handleSettingsUpdate({ dateFormat: newDateFormat as WorkspaceSettings["dateFormat"] });
    },
    [handleSettingsUpdate, canEditWorkspace],
  );

  // Handle public sharing toggle
  const handlePublicSharingToggle = useCallback(
    async (checked: boolean) => {
      if (!currentWorkspace || !canEditWorkspace) return;

      try {
        const updateData: UpdateWorkspaceRequest = {
          name: currentWorkspace.name,
          description: currentWorkspace.description || null,
          avatar: currentWorkspace.avatar || null,
          memberSubspaceCreate: currentWorkspace.memberSubspaceCreate ?? false,
          allowPublicSharing: !checked, // checked=true means disable, so allowPublicSharing=false
          settings: currentWorkspace.settings as WorkspaceSettings,
        };

        await updateWorkspace({ workspaceId: currentWorkspace.id, workspace: updateData });
        toast.success(t("Settings updated successfully"));
      } catch (error) {
        console.error("Failed to update public sharing setting:", error);
        toast.error(t("Failed to update settings"));
      } finally {
      }
    },
    [currentWorkspace, updateWorkspace, t, canEditWorkspace],
  );

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditWorkspace) {
      e.target.value = "";
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t("Please select a valid image file"));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("File size must be less than 5MB"));
      return;
    }

    // Create file with preview for the cropper
    const fileWithPreview: FileWithPreview = Object.assign(file, {
      preview: URL.createObjectURL(file),
      path: file.name,
    });

    setSelectedFile(fileWithPreview);
    setCropperDialogOpen(true);

    // Reset the input value so the same file can be selected again
    e.target.value = "";
  };

  // Update avatar after cropping
  const updateAvatar = useCallback(
    async (file: File) => {
      if (!currentWorkspace || !canEditWorkspace) return;

      try {
        // Upload the file using the new upload hook
        const uploadResult = await upload(file);

        // Update workspace with new avatar URL
        const updateData: UpdateWorkspaceRequest = {
          name: currentWorkspace.name,
          description: currentWorkspace.description || null,
          avatar: uploadResult.downloadUrl,
          memberSubspaceCreate: currentWorkspace.memberSubspaceCreate ?? false,
          settings: currentWorkspace.settings as WorkspaceSettings,
        };

        await updateWorkspace({ workspaceId: currentWorkspace.id, workspace: updateData });

        // Clean up
        setSelectedFile(null);
        setCropperDialogOpen(false);
        toast.success(t("Workspace avatar updated successfully"));
      } catch (error) {
        console.error("Failed to update avatar:", error);
        toast.error(t("Failed to update workspace avatar"));
      }
    },
    [currentWorkspace, t, canEditWorkspace, upload, updateWorkspace],
  );

  // Handle cropped image
  const handleCroppedImage = useCallback(
    (croppedImageDataUrl: string) => {
      if (!croppedImageDataUrl || !canEditWorkspace) {
        toast.error(t("Failed to crop image. Please try again."));
        return;
      }

      try {
        // Convert the cropped image data URL to a File
        const croppedFile = dataURLtoFile(croppedImageDataUrl, `workspace-avatar-${Date.now()}.png`);
        updateAvatar(croppedFile);
      } catch (error) {
        console.error("Failed to process cropped image:", error);
        toast.error(t("Failed to process image. Please try again."));
      }
    },
    [updateAvatar, t, canEditWorkspace],
  );

  const triggerFileInput = () => {
    if (isUploading || !canEditWorkspace) return;
    fileInputRef.current?.click();
  };

  if (!currentWorkspace) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium">{t("Workspace Settings")}</h3>
        <div className="text-center text-muted-foreground">{t("Loading...")}</div>
      </div>
    );
  }

  const avatarComponent = (
    <div className={`group relative flex h-fit items-center justify-center ${canEditWorkspace ? "cursor-pointer" : "cursor-default"}`}>
      <Avatar className="size-14">
        <AvatarImage src={currentWorkspace.avatar || ""} />
        <AvatarFallback className="text-lg">{currentWorkspace.name?.slice(0, 2).toUpperCase() || "WS"}</AvatarFallback>
      </Avatar>
      <div
        className="absolute left-0 top-0 size-full rounded-full bg-transparent group-hover:bg-muted-foreground/20 flex items-center justify-center"
        onClick={triggerFileInput}
      >
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t("Workspace")}</h3>
      <Separator />
      {/* Profile Section */}
      <div className="flex">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{avatarComponent}</TooltipTrigger>
            <TooltipContent>
              <p>{canEditWorkspace ? t("Click to upload and crop workspace logo") : t("You don't have permission to update the workspace logo")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="ml-4 flex-1">
          <Input
            className="w-full"
            defaultValue={currentWorkspace.name || ""}
            onBlur={handleNameUpdate}
            placeholder={t("Enter workspace name")}
            disabled={isUpdating || !canEditWorkspace}
          />
          <Label className="text-xs text-muted-foreground">{t("This is your workspace name that members will see")}</Label>
        </div>
      </div>

      {/* Preferences Section */}
      <div>
        <h3 className="text-base font-medium">{t("Preferences")}</h3>
        <Separator className="my-2" />

        <div className="space-y-4">
          {/* Timezone Setting */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>{t("Timezone")}</Label>
              <div className="text-xs text-muted-foreground">{t("This setting applies to the current workspace")}</div>
            </div>
            <div className="w-80">
              <Select value={timezone} onValueChange={handleTimezoneChange} disabled={isUpdating || !canEditWorkspace}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select timezone")} />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Format Setting */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>{t("Date Format")}</Label>
              <div className="text-xs text-muted-foreground">{t("This format will be used throughout the workspace")}</div>
            </div>
            <div className="w-80">
              <Select value={dateFormat} onValueChange={handleDateFormatChange} disabled={isUpdating || !canEditWorkspace}>
                <SelectTrigger>
                  <SelectValue placeholder={t("Select date format")} />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMAT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground mr-2">{option.description}</span>
                        <span>({option.label})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Public Sharing Setting */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label>{t("Disable public sharing")}</Label>
              <div className="text-xs text-muted-foreground">{t("After enabling, members will not be able to create public share links for documents")}</div>
            </div>
            <Switch
              checked={currentWorkspace.allowPublicSharing === false}
              onCheckedChange={handlePublicSharingToggle}
              disabled={isUpdatingWorkspace || !canEditWorkspace}
            />
          </div>
        </div>
      </div>

      {/* Image Cropper Dialog */}
      <ImageCropper
        dialogOpen={cropperDialogOpen && canEditWorkspace}
        setDialogOpen={setCropperDialogOpen}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
        onCropComplete={handleCroppedImage}
      />

      {/* Leave Workspace Button */}
      <div className="pt-4 flex justify-end">
        <Button variant="destructive" onClick={() => leaveWorkspace(workspaceId || "", currentWorkspace?.name || "")} disabled={!workspaceId}>
          {t("Leave Workspace")}
        </Button>
      </div>
    </div>
  );
};
