import React, { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ImageCropper } from "@/components/image-cropper";
import { Option } from "@/components/ui/multi-selector";
import { SubspaceTypeSchema } from "@idea/contracts";
import useSubSpaceStore, { useBatchAddSubspaceMembers } from "@/stores/subspace";
import { uploadFile } from "@/lib/upload";
import { dataURLtoFile } from "@/lib/file";
import { MoreAboutSubspaceTip } from "./more-about-subspace-tip";
import { SubspaceType } from "@idea/contracts";
import { MemberAndGroupSelect } from "@/components/member-group-select";
import { confirmable, ContextAwareConfirmation, type ConfirmDialogProps } from "react-confirm";
import { getInitialChar } from "@/lib/auth";

interface CreateSubspaceDialogProps {
  workspaceId: string;
  onSuccess?: () => void;

  // react-confirm props
  show?: boolean;
  proceed?: (value: any) => void;
}

interface FileWithPreview extends File {
  preview: string;
  path?: string;
}

const CreateSubspaceDialog: React.FC<ConfirmDialogProps<CreateSubspaceDialogProps, any>> = ({ show = false, proceed, workspaceId, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<SubspaceType>("WORKSPACE_WIDE");
  const [selectedMembers, setSelectedMembers] = useState<Option[]>([]);

  // Avatar upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [cropperDialogOpen, setCropperDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Get store methods
  const createSubspace = useSubSpaceStore((state) => state.create);
  const { run: batchAddSubspaceMembers } = useBatchAddSubspaceMembers();

  // Auto-focus name input when dialog opens
  useEffect(() => {
    if (show && nameInputRef.current) {
      // Small delay to ensure the dialog is fully rendered
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [show]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!show) {
      // Reset state when dialog closes
      setName("");
      setDescription("");
      setType("WORKSPACE_WIDE");
      setSelectedMembers([]);
      setAvatarUrl(null);
      setLoading(false);
      setUploading(false);
    }
  }, [show]);

  // Handle avatar upload
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      try {
        setUploading(true);
        // Upload the file
        const uploadResult = await uploadFile({ file });
        setAvatarUrl(uploadResult.downloadUrl);

        // Clean up
        setSelectedFile(null);
        setCropperDialogOpen(false);
        toast.success(t("Subspace avatar updated successfully"));
      } catch (error) {
        console.error("Failed to update avatar:", error);
        toast.error(t("Failed to update subspace avatar"));
      } finally {
        setUploading(false);
      }
    },
    [t],
  );

  // Handle cropped image
  const handleCroppedImage = useCallback(
    (croppedImageDataUrl: string) => {
      if (!croppedImageDataUrl) {
        toast.error(t("Failed to crop image. Please try again."));
        return;
      }

      try {
        // Convert the cropped image data URL to a File
        const croppedFile = dataURLtoFile(croppedImageDataUrl, `subspace-avatar-${Date.now()}.png`);
        updateAvatar(croppedFile);
      } catch (error) {
        console.error("Failed to process cropped image:", error);
        toast.error(t("Failed to process image. Please try again."));
      }
    },
    [updateAvatar, t],
  );

  const triggerFileInput = () => {
    if (uploading) return;
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t("Please enter a subspace name"));
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create subspace
      const subspace = await createSubspace({
        name: name.trim(),
        description: description.trim() || null,
        avatar: avatarUrl,
        type: SubspaceTypeSchema.enum[type],
        workspaceId,
      });

      // Step 2: Add members if any selected (skip for WORKSPACE_WIDE)
      if (type !== "WORKSPACE_WIDE" && selectedMembers.length > 0) {
        try {
          await batchAddSubspaceMembers({
            subspaceId: subspace.id,
            items: selectedMembers.map((item) => ({
              id: item.id as string,
              type: item.type as "user" | "group",
              role: "MEMBER",
            })),
          });
        } catch (memberError) {
          // Subspace created but member addition failed
          console.error("Failed to add members:", memberError);
          toast.warning(t("Subspace created but failed to add some members"));
        }
      } else {
        toast.success(t("Subspace created successfully"));
      }

      proceed?.(subspace);
      onSuccess?.();
    } catch (error) {
      console.error("Failed to create subspace:", error);
      toast.error(t("Failed to create subspace"));
    } finally {
      setLoading(false);
    }
  };

  const avatarComponent = (
    <div className="group relative flex h-fit items-center justify-center cursor-pointer">
      <Avatar className="size-14">
        <AvatarImage src={avatarUrl || ""} />
        <AvatarFallback className="text-lg">{getInitialChar(name) || "S"}</AvatarFallback>
      </Avatar>
      <div
        className="absolute left-0 top-0 size-full rounded-full bg-transparent group-hover:bg-muted-foreground/20 flex items-center justify-center"
        onClick={triggerFileInput}
      >
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
    </div>
  );

  const handleCancel = () => {
    proceed?.(null);
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>{t("Create Subspace")}</DialogTitle>
            <div className="flex-shrink-0 ml-4">
              <MoreAboutSubspaceTip className="mr-1" />
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar and Name Section */}
          <div className="space-y-2">
            <Label>{t("Avatar and Name")}</Label>
            <div className="flex">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>{avatarComponent}</TooltipTrigger>
                  <TooltipContent>
                    <p>{t("Click to upload and crop subspace logo")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="ml-4 flex-1">
                <Input
                  ref={nameInputRef}
                  className="w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("Please enter subspace name")}
                  disabled={loading}
                />
                <Label className="text-xs text-muted-foreground">{t("This is your subspace name that members will see")}</Label>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2">
            <Label>{t("Description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("Please enter subspace description")}
              disabled={loading}
              rows={3}
            />
          </div>

          {/* Subspace Type Section */}
          <div className="space-y-2">
            <Label>{t("Subspace Type")}</Label>
            <Select value={type} onValueChange={(value: SubspaceType) => setType(value)} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WORKSPACE_WIDE">{t("Workspace-wide Space")}</SelectItem>
                <SelectItem value="PUBLIC">{t("Public Space")}</SelectItem>
                <SelectItem value="INVITE_ONLY">{t("Invitation Space")}</SelectItem>
                <SelectItem value="PRIVATE">{t("Private Space")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add Members Section */}
          {type !== "WORKSPACE_WIDE" ? (
            <div className="space-y-2">
              <Label>{t("Add Subspace Members")}</Label>
              <MemberAndGroupSelect
                workspaceId={workspaceId}
                selectedItems={selectedMembers}
                onSelectionChange={setSelectedMembers}
                placeholder={t("Select member or member group")}
                searchPlaceholder={t("Search members or groups...")}
                disabled={loading}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{t("Add Subspace Members")}</Label>
              <div className="text-muted-foreground text-sm">{t("Members are automatically set to all workspace members for an workspace-wide space.")}</div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end">
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              {t("Cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
              {loading ? t("Creating...") : t("Create Subspace")}
            </Button>
          </div>
        </DialogFooter>

        {/* Image Cropper Dialog */}
        <ImageCropper
          dialogOpen={cropperDialogOpen}
          setDialogOpen={setCropperDialogOpen}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          onCropComplete={handleCroppedImage}
        />
      </DialogContent>
    </Dialog>
  );
};

// Create the confirm modal
export const showCreateSubspaceModal = ContextAwareConfirmation.createConfirmation(confirmable(CreateSubspaceDialog));
