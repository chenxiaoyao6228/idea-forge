export type OssProvider = "minio" | "cos" | "oss";

export interface OssConfig {
  provider: OssProvider;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region?: string;
  endpoint?: string;
  // Optional configurations
  cdnDomain?: string;
  internal?: boolean;
  secure?: boolean;
}

export interface PresignedUrlOptions {
  /** Content-Type of the upload file, e.g. image/jpeg, application/pdf etc */
  contentType: string;
  expires?: number;
  maxSize?: number;
  metadata?: Record<string, string>;
}

export interface PresignedUrlResult {
  url: string;
  key: string;
  fields?: Record<string, string>;
  headers?: Record<string, string>;
}
