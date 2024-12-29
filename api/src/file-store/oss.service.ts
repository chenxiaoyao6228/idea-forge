import { S3Client, ListBucketsCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
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
    const endpoint = this.configService.get<string>("OSS_ENDPOINT");

    if (!provider || !accessKeyId || !accessKeySecret || !bucket || !region || !endpoint) {
      throw new Error("OSS configuration is missing");
    }

    this.config = {
      provider,
      accessKeyId,
      accessKeySecret,
      bucket,
      region,
      endpoint,
    };

    this.s3Client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.accessKeySecret,
      },
      forcePathStyle: this.config.provider === "minio", // minio 需要这个配置
    });
  }

  // 生成上传凭证
  async generatePresignedUrl(key: string, options: PresignedUrlOptions = { contentType: "image/png" }): Promise<PresignedUrlResult> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: options.contentType,
      Metadata: options.metadata,
    });

    const url = await getSignedUrl(this.s3Client, command, {
      expiresIn: options.expires || 3600,
    });

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

  // 获取文件访问URL
  getFileUrl(key: string): string {
    if (this.config.cdnDomain) {
      return `${this.config.cdnDomain}/${key}`;
    }
    return `${this.config.endpoint}/${this.config.bucket}/${key}`;
  }
}
