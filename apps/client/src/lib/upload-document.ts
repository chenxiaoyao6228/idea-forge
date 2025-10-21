import { importApi } from "@/apis/imports";
import { getFileInfo } from "@idea/utils";

/**
 * Upload document for import
 * This follows the two-phase upload pattern: prepare → upload to OSS → start import
 */
export const uploadDocumentForImport = async ({
  file,
  workspaceId,
  subspaceId,
  parentId = null as string | null,
  title,
}: {
  file: File;
  workspaceId: string;
  subspaceId: string;
  parentId?: string | null;
  title: string;
}) => {
  // 1. Validate file type
  const validExtensions = [".md", ".html", ".docx", ".csv", ".xlsx", ".xls", ".txt"];
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !validExtensions.includes(`.${ext}`)) {
    throw new Error(`Unsupported file type: ${ext}. Supported types: ${validExtensions.join(", ")}`);
  }

  // 2. Validate file size (10MB limit)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("File size exceeds 10MB limit");
  }

  // 3. Get file information
  const fileInfo = await getFileInfo(file);

  // 4. Prepare import - get presigned URL
  const { uploadUrl, fileKey, importJobId } = await importApi.prepare({
    fileName: file.name,
    mimeType: fileInfo.mimeType || file.type || "application/octet-stream",
    workspaceId,
    subspaceId,
    parentId,
    title,
  });

  // 5. Upload to OSS
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": fileInfo.mimeType || file.type || "application/octet-stream",
    },
    mode: "cors",
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  // 6. Start import job
  return await importApi.start({
    importJobId,
    fileKey,
  });
};
