import request from "./request";

export const uploadFile = async (file: File, fileType: string) => {
  // 1. 获取上传凭证
  const response = await request<
    { fileType: string },
    {
      uploadUrl: string;
      fileUrl: string;
      key: string;
      authorization: string;
      securityToken: string;
      xCosSecurityToken: string;
    }
  >("/api/upload/credentials", {
    method: "POST",
    data: { fileType },
  });

  // 2. 上传文件
  const url = new URL(response.uploadUrl);
  const uploadResponse = await fetch(response.uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
      Authorization: response.authorization,
      "x-cos-security-token": response.xCosSecurityToken,
      "x-cos-acl": "public-read",
      host: url.host,
    },
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload file: ${errorText}`);
  }

  // 3. 返回文件访问地址
  return response.fileUrl;
};
