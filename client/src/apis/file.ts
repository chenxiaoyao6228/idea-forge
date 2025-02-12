import request from "@/lib/request";
import {
  ConfirmUploadResponse,
  ConfirmUploadRequest,
  ProxyImageRequest,
  ProxyImageResponse,
  UploadCredentialsRequest,
  UploadCredentialsResponse,
} from "shared";

export const fileApi = {
  proxyImage: (data: ProxyImageRequest) => request.post<ProxyImageRequest, ProxyImageResponse>("/api/files/proxy-image", data),

  getUploadCredentials: (data: UploadCredentialsRequest) => request.post<UploadCredentialsRequest, UploadCredentialsResponse>("/api/files/credentials", data),

  confirmUpload: (data: ConfirmUploadRequest) => request.post<ConfirmUploadRequest, ConfirmUploadResponse>("/api/files/confirm", data),
};
