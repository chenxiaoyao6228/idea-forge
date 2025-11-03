import { fileApi } from "@/apis/file";
import { compressImage } from "./image";
import type { z } from "zod";
import { ConfirmUploadResponseSchema, FileContextType } from "@idea/contracts";
import { getFileInfo } from "@idea/utils";

export const uploadFile = async ({
  file,
  context = "user",
}: {
  file: File;
  context?: FileContextType;
}): Promise<z.infer<typeof ConfirmUploadResponseSchema>> => {
  // Get file information including real mime type and extension
  const fileInfo = await getFileInfo(file);

  // Compress file before upload
  const compressedFile = await compressImage(file);

  // Get upload credentials with context
  const { credentials, fileKey, fileId } = await fileApi.getUploadCredentials({
    fileName: compressedFile.name,
    ext: fileInfo.ext,
    context, // Pass context to backend
  });

  // Configure upload request
  const uploadRes = await fetch(credentials.url, {
    method: "PUT",
    body: compressedFile,
    headers: {
      ...credentials.headers,
      "Content-Type": fileInfo.mimeType || "application/octet-stream",
    },
    mode: "cors",
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  // Confirm upload
  return await fileApi.confirmUpload({ fileKey, fileId });
};
