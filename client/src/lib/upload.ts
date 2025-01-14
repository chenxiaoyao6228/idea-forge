import request from "./request";
import { delay } from "./utils";

export const uploadFile = async ({ file, ext }: { file: File; ext: string }) => {
  const { credentials, fileKey, fileId } = (await request("/api/files/credentials", {
    method: "POST",
    data: {
      fileName: file.name,
      ext,
    },
  })) as any;

  // Configure upload request
  const uploadRes = await fetch(credentials.url, {
    method: "PUT",
    body: file,
    headers: {
      ...credentials.headers,
      // Ensure Content-Type is set correctly
      "Content-Type": file.type || "application/octet-stream",
    },
    mode: "cors",
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  // await delay(5000);

  // Confirm upload
  return (await request("/api/files/confirm", {
    method: "POST",
    data: {
      fileKey,
      fileId,
    },
  })) as {
    fileKey: string;
    downloadUrl: string;
    fileId: string;
  };
};
