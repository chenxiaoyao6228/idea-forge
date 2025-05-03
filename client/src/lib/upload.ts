import { fileApi } from "@/apis/file";
import { compressImage } from "./image";
import type { z } from "zod";
import { ConfirmUploadResponseSchema } from "contracts";
import { getFileInfo } from "./file";

export const uploadFile = async ({ file }: { file: File }): Promise<z.infer<typeof ConfirmUploadResponseSchema>> => {
  // Get file information including real mime type and extension
  const fileInfo = await getFileInfo(file);

  // Compress file before upload
  const compressedFile = await compressImage(file);

  // Get upload credentials
  const { credentials, fileKey, fileId } = await fileApi.getUploadCredentials({
    fileName: compressedFile.name,
    ext: fileInfo.ext,
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
