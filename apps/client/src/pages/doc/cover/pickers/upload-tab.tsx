import { uploadFile } from "@/lib/upload";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Spinner } from '@idea/ui/base/spinner';
import { UpdateCoverDto } from "@idea/contracts";
import { useTranslation } from "react-i18next";

interface UploadTabProps {
  onSelect: (dto: UpdateCoverDto) => Promise<void>;
  onClose: () => void;
}

export function UploadTab({ onSelect, onClose }: UploadTabProps) {
  const { t } = useTranslation();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        try {
          setIsUploading(true);
          // Create preview URL
          const objectUrl = URL.createObjectURL(file);
          setPreviewUrl(objectUrl);

          const { downloadUrl } = await uploadFile({ file });
          await onSelect({ url: downloadUrl, isPreset: false });

          // Clean up preview URL
          URL.revokeObjectURL(objectUrl);
          setPreviewUrl(null);
        } catch (error) {
          console.error("Error uploading file:", error);
        } finally {
          setIsUploading(false);
          onClose();
        }
      }
    },
    [onSelect],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    multiple: false,
  });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"}`}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <div className="relative">
          {previewUrl && (
            <>
              <img src={previewUrl} alt={t("Preview")} className="max-h-48 mx-auto object-contain" />
              <div className="absolute inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center">
                <div className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/80">
                  <Spinner size="sm" text={t("Uploading...")} />
                </div>
              </div>
            </>
          )}
          {!previewUrl && (
            <div className="flex justify-center items-center py-4">
              <Spinner size="sm" className="mr-2" text={t("Uploading...")} />
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-600">{isDragActive ? t("Drop the image here...") : t("Drag 'n' drop an image here, or click to select one")}</p>
      )}
    </div>
  );
}
