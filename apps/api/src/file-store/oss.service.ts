/**
 * OSS (Object Storage Service) Service
 *
 * Supports multiple storage providers and deployment scenarios:
 *
 * === MinIO Scenarios ===
 *
 * 1. Local Development (default):
 *    - OSS_ENDPOINT: Empty (auto-derives http://localhost:MINIO_PORT)
 *    - OSS_CDN_ENDPOINT: Empty (auto-derives from CLIENT_APP_URL)
 *    - S3 client uses: http://localhost:9000
 *    - Presigned URLs: http://localhost:9000/bucket/file
 *    - Download URLs: http://localhost:9000/bucket/file
 *
 * 2. Production - Behind Nginx Reverse Proxy (RECOMMENDED):
 *    - OSS_ENDPOINT: Set to subdomain (e.g., https://assets.yourdomain.com)
 *    - OSS_CDN_ENDPOINT: Empty for most deployments
 *    - S3 client uses: https://assets.yourdomain.com
 *    - Presigned URLs: https://assets.yourdomain.com/bucket/file
 *    - Download URLs: Uses OSS_ENDPOINT
 *    - Note: Use subdomain (assets.yourdomain.com), not path (/storage), for reliable S3 signatures
 *
 *    Advanced with CDN (optional):
 *    - OSS_CDN_ENDPOINT: Set to CDN URL (e.g., https://cdn.yourdomain.com)
 *    - Uploads still use OSS_ENDPOINT, downloads use OSS_CDN_ENDPOINT
 *    - Requires Cloudflare/CloudFront/etc configured to cache from MinIO
 *
 * === Cloud OSS Scenarios ===
 *
 * 3. Cloud OSS without CDN:
 *    - OSS_ENDPOINT: Set to actual OSS endpoint (e.g., https://oss-region.aliyuncs.com)
 *    - OSS_CDN_ENDPOINT: Empty
 *    - S3 client uses: OSS_ENDPOINT
 *    - Presigned URLs: https://oss-region.aliyuncs.com/bucket/file
 *    - Download URLs: Uses OSS_ENDPOINT
 *
 * 4. Cloud OSS with CDN:
 *    - OSS_ENDPOINT: Set to actual OSS endpoint
 *    - OSS_CDN_ENDPOINT: Set to CDN URL (e.g., https://cdn.yourdomain.com)
 *    - S3 client uses: OSS_ENDPOINT (for uploads/presigned URLs)
 *    - Presigned URLs: https://oss-region.aliyuncs.com/bucket/file (upload directly to OSS)
 *    - Download URLs: Uses OSS_CDN_ENDPOINT (downloads via CDN)
 */

import {
  S3Client,
  ListBucketsCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { OssProvider, PresignedUrlResult, PresignedUrlOptions } from "./oss.type";
import { OssConfig } from "./oss.type";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class OssService {
  private s3Client: S3Client;
  private config: OssConfig;

  constructor(private configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    const provider = this.configService.get<OssProvider>("OSS_PROVIDER");
    const accessKeyId = this.configService.get<string>("OSS_SECRET_ID");
    const accessKeySecret = this.configService.get<string>("OSS_SECRET_KEY");
    const region = this.configService.get<string>("OSS_REGION");
    const bucket = this.configService.get<string>("OSS_BUCKET");

    if (!provider || !accessKeyId || !accessKeySecret || !bucket || !region) {
      throw new Error("OSS configuration is missing");
    }

    // Determine internal endpoint for S3 client
    let internalEndpoint: string;

    if (provider === "minio") {
      // MinIO: Check if OSS_ENDPOINT is provided (for reverse proxy setups)
      const ossEndpoint = this.configService.get<string>("OSS_ENDPOINT");

      if (ossEndpoint) {
        // Use OSS_ENDPOINT directly (should be subdomain like https://storage.domain.com)
        // Subdomain approach ensures S3 signatures work correctly
        internalEndpoint = ossEndpoint;
      } else {
        // Auto-derive endpoint based on environment (direct MinIO access)
        const minioPort = this.configService.get<string>("MINIO_PORT") || "9000";
        const nodeEnv = this.configService.get<string>("NODE_ENV");

        if (nodeEnv === "production" || nodeEnv === "test") {
          // Docker deployment: Use internal service name
          internalEndpoint = `http://minio:${minioPort}`;
        } else {
          // Local development: Use localhost
          internalEndpoint = `http://localhost:${minioPort}`;
        }
      }
    } else {
      // Cloud OSS: Must use OSS_ENDPOINT (not CDN) for S3 client
      // This is required for generating valid presigned URLs
      const ossEndpoint = this.configService.get<string>("OSS_ENDPOINT");
      if (!ossEndpoint) {
        throw new Error("OSS_ENDPOINT is required for cloud OSS providers (use the actual OSS endpoint, not CDN)");
      }
      internalEndpoint = ossEndpoint;
    }

    this.config = {
      provider,
      accessKeyId,
      accessKeySecret,
      bucket,
      region,
      endpoint: internalEndpoint,
    };

    this.s3Client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.accessKeySecret,
      },
      forcePathStyle: this.config.provider === "minio", // minio need this config
    });
  }

  // Generate upload credentials
  async generatePresignedUrl(key: string, options: PresignedUrlOptions = { contentType: "image/png" }): Promise<PresignedUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: options.contentType,
      Metadata: options.metadata,
    });

    let url = await getSignedUrl(this.s3Client, command, {
      expiresIn: options.expires || 3600,
    });

    // For MinIO without OSS_ENDPOINT, replace internal endpoint with public URL
    const ossEndpoint = this.configService.get<string>("OSS_ENDPOINT");
    if (this.config.provider === "minio" && !ossEndpoint) {
      const cdnEndpoint = this.configService.get<string>("OSS_CDN_ENDPOINT");
      const internalUrl = `${this.config.endpoint}/${this.config.bucket}`;

      if (cdnEndpoint) {
        // Check if CDN endpoint already includes bucket name
        // Supports both: http://localhost:9000 and http://localhost:9000/bucket-name
        const publicUrl = cdnEndpoint.endsWith(`/${this.config.bucket}`)
          ? cdnEndpoint // Already includes bucket
          : `${cdnEndpoint}/${this.config.bucket}`; // Need to add bucket
        url = url.replace(internalUrl, publicUrl);
      } else {
        // Without CDN: Derive public URL from CLIENT_APP_URL
        // This supports both domain and IP access
        const clientAppUrl = this.configService.get("CLIENT_APP_URL");
        const minioPort = this.configService.get("MINIO_PORT");
        if (clientAppUrl && minioPort) {
          const clientUrl = new URL(clientAppUrl);
          const publicUrl = `${clientUrl.protocol}//${clientUrl.hostname}:${minioPort}/${this.config.bucket}`;
          url = url.replace(internalUrl, publicUrl);
        }
      }
    }

    return {
      url,
      key,
      headers: {
        "Content-Type": options.contentType,
      },
    };
  }

  // Check if a file exists in the bucket
  async checkFileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound") {
        return false;
      }
      throw error;
    }
  }

  // Get file access URL (for downloads)
  getFileUrl(key: string): string {
    // Priority 1: Use OSS_CDN_ENDPOINT if provided (for CDN acceleration)
    const cdnEndpoint = this.configService.get("OSS_CDN_ENDPOINT");
    if (cdnEndpoint) {
      // Check if CDN endpoint already includes bucket name
      // Supports both formats: http://localhost:9000 and http://localhost:9000/bucket-name
      if (cdnEndpoint.endsWith(`/${this.config.bucket}`)) {
        return `${cdnEndpoint}/${key}`; // CDN already has bucket
      }
      return `${cdnEndpoint}/${this.config.bucket}/${key}`; // Need to add bucket
    }

    // Priority 2: For MinIO with OSS_ENDPOINT (reverse proxy), use it for downloads
    const ossEndpoint = this.configService.get("OSS_ENDPOINT");
    if (this.config.provider === "minio" && ossEndpoint) {
      // OSS_ENDPOINT already includes /storage path if configured
      // Check if it already includes bucket name
      if (ossEndpoint.endsWith(`/${this.config.bucket}`)) {
        return `${ossEndpoint}/${key}`;
      }
      return `${ossEndpoint}/${this.config.bucket}/${key}`;
    }

    // Priority 3: For MinIO without OSS_ENDPOINT (local dev), derive from CLIENT_APP_URL
    if (this.config.provider === "minio") {
      const clientAppUrl = this.configService.get("CLIENT_APP_URL");
      const minioPort = this.configService.get("MINIO_PORT");
      if (clientAppUrl && minioPort) {
        const url = new URL(clientAppUrl);
        return `${url.protocol}//${url.hostname}:${minioPort}/${this.config.bucket}/${key}`;
      }
    }

    // Priority 4: For Cloud OSS without CDN, use OSS_ENDPOINT
    if (ossEndpoint) {
      if (ossEndpoint.endsWith(`/${this.config.bucket}`)) {
        return `${ossEndpoint}/${key}`;
      }
      return `${ossEndpoint}/${this.config.bucket}/${key}`;
    }

    // Fallback: Use internal endpoint (shouldn't happen in practice)
    return `${this.config.endpoint}/${this.config.bucket}/${key}`;
  }

  // Delete file from OSS
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error: any) {
      if (error.name !== "NotFound") {
        throw error;
      }
      // If file doesn't exist, we can consider delete successful
    }
  }

  // Update/Move file in OSS (copy to new location and delete old)
  async moveFile(oldKey: string, newKey: string): Promise<void> {
    try {
      // First copy the object to new location
      const copyCommand = new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${oldKey}`,
        Key: newKey,
      });

      await this.s3Client.send(copyCommand);

      // Then delete the old object
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: oldKey,
      });

      await this.s3Client.send(deleteCommand);
    } catch (error: any) {
      throw new Error(`Failed to move file: ${error.message}`);
    }
  }

  // Optional: Add method to update file metadata
  async updateFileMetadata(key: string, metadata: Record<string, string>): Promise<void> {
    try {
      const copyCommand = new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${key}`,
        Key: key,
        Metadata: metadata,
        MetadataDirective: "REPLACE",
      });

      await this.s3Client.send(copyCommand);
    } catch (error: any) {
      throw new Error(`Failed to update file metadata: ${error.message}`);
    }
  }

  // Upload file to OSS, for proxy-image api
  async uploadFile(key: string, file: Buffer, options: { contentType: string }) {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: file,
      ContentType: options.contentType,
    });

    return await this.s3Client.send(command);
  }

  // Download file from OSS
  async getFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error("No file body in response");
      }

      // Stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error: any) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }
}
