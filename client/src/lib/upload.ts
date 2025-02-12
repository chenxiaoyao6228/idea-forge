import { fileApi } from "@/apis/file";
import { compressImage } from "./image";
import type { z } from "zod";
import { ConfirmUploadResponseSchema } from "shared";

export const uploadFile = async ({ file, ext }: { file: File; ext: string }): Promise<z.infer<typeof ConfirmUploadResponseSchema>> => {
  // Compress file before upload
  const compressedFile = await compressImage(file);

  // Get upload credentials
  const { credentials, fileKey, fileId } = await fileApi.getUploadCredentials({
    fileName: compressedFile.name,
    ext,
  });

  // Configure upload request
  const uploadRes = await fetch(credentials.url, {
    method: "PUT",
    body: compressedFile,
    headers: {
      ...credentials.headers,
      "Content-Type": compressedFile.type || "application/octet-stream",
    },
    mode: "cors",
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  // Confirm upload
  const confirmRes = await fileApi.confirmUpload({ fileKey, fileId });

  return confirmRes;
};
