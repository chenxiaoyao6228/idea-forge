import request from "./request";

export const uploadFile = async ({ file, ext }: { file: File; ext: string }) => {
  const { credentials, fileKey, fileId } = (await request("/api/files/credentials", {
    method: "POST",
    data: {
      fileName: file.name,
      ext,
    },
  })) as any;

  // 修改上传请求配置
  const uploadRes = await fetch(credentials.url, {
    method: "PUT",
    body: file,
    headers: {
      ...credentials.headers,
      // 确保 Content-Type 正确设置
      "Content-Type": file.type || "application/octet-stream",
    },
    mode: "cors",
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
  }

  // 确认上传
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
