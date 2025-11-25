import React, { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import useUserStore from "@/stores/user-store";
import { userApi } from "@/apis/user";
import { useFileUpload } from "@/hooks/use-file-upload";
import { UserAvatar } from "@/components/user-avatar";
import { ImageCropper, type FileWithPreview } from "@/components/image-cropper";
import { Button } from "@idea/ui/shadcn/ui/button";
import { Input } from "@idea/ui/shadcn/ui/input";
import { Label } from "@idea/ui/shadcn/ui/label";
import { Separator } from "@idea/ui/shadcn/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@idea/ui/shadcn/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@idea/ui/shadcn/ui/dialog";
import { ResetPwdForm } from "@/components/reset-pwd-form";
import { UpdateUserRequest } from "@idea/contracts";
import { dataURLtoFile } from "@/lib/file";
import { toast } from "sonner";
import { authApi } from "@/apis/auth";
import { useLogout } from "@/stores/user-store";
import { LogOut } from "lucide-react";
import Loading from "@idea/ui/base/loading";

const AddPasswordDialog: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { userInfo } = useUserStore();
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    toast.success(t("Password set successfully!"), {
      description: t("You can now use your password to sign in."),
    });
    // Refresh password status
    window.location.reload();
  };

  const handleCancel = () => {
    setOpen(false);
  };

  if (!userInfo?.email) return <>{children}</>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Set Password")}</DialogTitle>
        </DialogHeader>

        <ResetPwdForm
          email={userInfo.email}
          mode="set"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          showCancelButton={true}
          submitButtonText={t("Set Password")}
        />
      </DialogContent>
    </Dialog>
  );
};

const ChangePasswordDialog: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { userInfo } = useUserStore();
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    toast.success(t("Password changed successfully!"), {
      description: t("For security, you've been logged out of other devices. Your current session remains active."),
    });
  };

  const handleCancel = () => {
    setOpen(false);
  };

  if (!userInfo?.email) return <>{children}</>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Change Password")}</DialogTitle>
        </DialogHeader>

        <ResetPwdForm
          email={userInfo.email}
          mode="reset"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          showCancelButton={true}
          submitButtonText={t("Change Password")}
        />
      </DialogContent>
    </Dialog>
  );
};

export const Account = () => {
  const { t } = useTranslation();
  const userInfo = useUserStore((state) => state.userInfo);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const { logout, loading: logoutLoading } = useLogout();

  // Image cropper states
  const [cropperDialogOpen, setCropperDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);

  // Use the new file upload hook with 'user' context
  const { upload, uploading: isUploading, error: uploadError } = useFileUpload({ context: "user" });

  // Update user mutation
  function updateUser(data: UpdateUserRequest) {
    if (!userInfo?.id) throw new Error("User not found");
    return userApi
      .update(userInfo.id, data)
      .then((response: any) => {
        useUserStore.setState({ userInfo: response });
      })
      .catch((error) => {
        console.error("Failed to update user:", error);
      });
  }

  // Update avatar mutation using the new file upload hook
  async function updateAvatar(file: File) {
    if (!userInfo?.id) throw new Error("User not found");

    try {
      // Use the new upload hook
      const uploadResult = await upload(file);

      // Update user profile with new avatar URL
      const response = (await userApi.update(userInfo.id, { imageUrl: uploadResult.downloadUrl })) as any;

      // Handle the API response
      useUserStore.setState({ userInfo: response });

      // Clean up the selected file and close cropper
      setSelectedFile(null);
      setCropperDialogOpen(false);
      toast.success(t("Avatar updated successfully!"));
    } catch (error) {
      console.error("Failed to update avatar:", error);
      toast.error(t("Failed to upload avatar. Please try again."));
    }
  }

  // Regenerate avatar with random seed
  async function regenerateAvatar() {
    if (!userInfo?.id) throw new Error("User not found");

    try {
      // Generate random seed for new avatar
      const randomSeed = Math.random().toString(36).substring(7);
      const response = await userApi.regenerateAvatar(userInfo.id, randomSeed);

      // Update user store with new avatar (convert null to undefined for type compatibility)
      const updatedUser = {
        ...response.data,
        displayName: response.data.displayName ?? undefined,
        imageUrl: response.data.imageUrl ?? undefined,
      };
      useUserStore.setState({ userInfo: updatedUser as any });
      toast.success(t("Avatar regenerated successfully!"));
    } catch (error) {
      console.error("Failed to regenerate avatar:", error);
      toast.error(t("Failed to regenerate avatar. Please try again."));
    }
  }

  // Show upload error if any
  useEffect(() => {
    if (uploadError) {
      toast.error(t("Failed to upload avatar: ") + uploadError);
    }
  }, [uploadError, t]);

  const handleNameUpdate = (e: React.FocusEvent<HTMLInputElement>) => {
    const name = e.target.value.trim();
    if (name && name !== userInfo?.displayName) {
      updateUser({ displayName: name });
    }
  };

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

  // Handle the cropped image from the ImageCropper component
  const handleCroppedImage = useCallback(
    (croppedImageDataUrl: string) => {
      if (!croppedImageDataUrl) {
        toast.error(t("Failed to crop image. Please try again."));
        return;
      }

      try {
        // Convert the cropped image data URL to a File
        const croppedFile = dataURLtoFile(croppedImageDataUrl, `avatar-${Date.now()}.png`);

        updateAvatar(croppedFile);
      } catch (error) {
        console.error("Failed to process cropped image:", error);
        toast.error(t("Failed to process image. Please try again."));
      }
    },
    [t],
  );

  const triggerFileInput = () => {
    if (isUploading) return; // Prevent multiple uploads
    fileInputRef.current?.click();
  };

  if (!userInfo) {
    <Loading size="lg" />;
  }

  const avatarComponent = (
    <div className="group relative flex h-fit items-center justify-center cursor-pointer">
      <UserAvatar
        className="size-14"
        user={{
          displayName: userInfo?.displayName || userInfo?.email || "",
          imageUrl: userInfo?.imageUrl || "",
        }}
      />
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

  // Fetch password status on component mount
  useEffect(() => {
    const fetchPasswordStatus = async () => {
      try {
        const response = await authApi.getPasswordStatus();
        setHasPassword(response.hasPassword);
      } catch (error) {
        console.error("Failed to fetch password status:", error);
        // Default to true to show change password option
        setHasPassword(true);
      }
    };

    if (userInfo?.id) {
      fetchPasswordStatus();
    }
  }, [userInfo?.id]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t("Account")}</h3>
      <Separator />
      <>
        {/* Profile Section */}
        <div className="space-y-4">
          <div className="flex">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>{avatarComponent}</TooltipTrigger>
                <TooltipContent>
                  <p>{t("Click to upload and crop your photo")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="ml-4 flex-1">
              <Input className="w-full" defaultValue={userInfo?.displayName || ""} onBlur={handleNameUpdate} placeholder={t("Enter your display name")} />
              <Label className="text-xs text-muted-foreground">{t("This is your display name that others will see")}</Label>
            </div>
          </div>

          {/* Avatar options */}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={triggerFileInput} disabled={isUploading}>
              {isUploading ? t("Uploading...") : t("Upload Photo")}
            </Button>
            <Button size="sm" variant="outline" onClick={regenerateAvatar}>
              {t("Generate Random Avatar")}
            </Button>
          </div>
        </div>

        {/* Security Section */}
        <div>
          <h3 className="text-base font-medium flex items-center justify-between">
            {t("Security")}
            {!hasPassword && (
              <AddPasswordDialog>
                <Button size="sm" variant="outline" className="ml-2">
                  {t("Add Password")}
                </Button>
              </AddPasswordDialog>
            )}
          </h3>
          <Separator className="my-2" />

          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("Email")}</Label>
                <div className="text-xs text-muted-foreground">{userInfo?.email}</div>
              </div>
            </div>

            {/* Password */}
            {hasPassword && (
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t("Password")}</Label>
                  <div className="text-xs text-muted-foreground">{t("Keep your account secure with a strong password")}</div>
                </div>
                <ChangePasswordDialog>
                  <Button size="sm" variant="outline">
                    {t("Change Password")}
                  </Button>
                </ChangePasswordDialog>
              </div>
            )}
          </div>
        </div>

        {/* Account Info */}
        <div>
          <h3 className="text-base font-medium">{t("Account Information")}</h3>
          <Separator className="my-2" />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("User ID")}</Label>
                <div className="text-xs text-muted-foreground font-mono">{userInfo?.id}</div>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-2" />
        <div className="flex justify-end">
          <Button variant="destructive" size="sm" onClick={logout} disabled={logoutLoading}>
            <LogOut className="h-4 w-4" />
            <span className="ml-2">{t("Sign Out")}</span>
          </Button>
        </div>

        {/* Image Cropper Dialog */}
        {selectedFile && (
          <ImageCropper
            dialogOpen={cropperDialogOpen}
            setDialogOpen={setCropperDialogOpen}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            onCropComplete={handleCroppedImage}
          />
        )}
      </>
    </div>
  );
};
