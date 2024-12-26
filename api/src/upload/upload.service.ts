import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as COS from "cos-nodejs-sdk-v5";
import { v4 as uuidv4 } from "uuid";
import * as STS from "qcloud-cos-sts";
import * as fs from "node:fs";
import * as path from "node:path";

@Injectable()
export class CosService {
  private cos: COS;
  private readonly isLocalStorage: boolean;

  constructor(private configService: ConfigService) {
    const secretId = this.configService.get("cos.secretId");

    // for fast dev only
    this.isLocalStorage = !secretId || secretId === "your_secret_id";

    if (!this.isLocalStorage) {
      this.cos = new COS({
        SecretId: secretId,
        SecretKey: this.configService.get("cos.secretKey"),
      });
    }
  }

  async generateUploadCredentials(userId: number, fileType: string) {
    const fileName = `${uuidv4()}.${fileType}`;
    const key = `uploads/${userId}/imgs/${fileName}`;

    if (this.isLocalStorage) {
      // Ensure upload directory exists
      const uploadDir = path.join(process.cwd(), "uploads", userId.toString(), "imgs");
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const fileUrl = `http://localhost:${process.env.NEST_API_PORT}/uploads/${userId}/imgs/${fileName}`;

      // Return a format compatible with COS credentials
      return {
        uploadUrl: `http://localhost:${process.env.NEST_API_PORT}/api/upload/local/${fileName}`,
        fileUrl,
        key,
        // Add dummy values to match COS response structure
        authorization: "local-storage",
        securityToken: "local-storage",
        xCosSecurityToken: "local-storage",
      };
    }

    const secretId = this.configService.get("cos.secretId");
    const secretKey = this.configService.get("cos.secretKey");
    const bucket = this.configService.get("cos.bucket");
    const region = this.configService.get("cos.region");
    const bucketUrl = this.configService.get("cos.bucketUrl");
    const appId = this.configService.get("cos.appId");

    if (!bucket || !region || !bucketUrl || !secretId || !secretKey || !appId) {
      throw new Error("COS bucket or region not found");
    }

    const policy = {
      version: "2.0",
      statement: [
        {
          action: ["name/cos:PutObject", "name/cos:PostObject"],
          effect: "allow",
          resource: [`qcs::cos:${region}:uid/${appId}:${bucket}/${key}`],
        },
      ],
    };

    try {
      const tempCredentials = (await new Promise((resolve, reject) => {
        STS.getCredential(
          {
            secretId,
            secretKey,
            policy,
            durationSeconds: 1800,
          },
          (err, tempKeys) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(tempKeys);
          },
        );
      })) as any;

      const cos = new COS({
        SecretId: tempCredentials.credentials.tmpSecretId,
        SecretKey: tempCredentials.credentials.tmpSecretKey,
        SecurityToken: tempCredentials.credentials.sessionToken,
      });

      const authorization = (await new Promise((resolve, reject) => {
        cos.getObjectUrl(
          {
            Bucket: bucket,
            Region: region,
            Key: key,
            Sign: true,
            Method: "PUT",
            Expires: 600,
            Headers: {
              "x-cos-acl": "public-read",
              host: `${bucket}.cos.${region}.myqcloud.com`,
            },
          },
          (err, data) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(data);
          },
        );
      })) as any;

      return {
        uploadUrl: authorization.Url,
        fileUrl: `${bucketUrl}/${key}`,
        key,
        authorization: authorization.Authorization,
        securityToken: tempCredentials.credentials.sessionToken,
        xCosSecurityToken: tempCredentials.credentials.sessionToken,
      };
    } catch (error: any) {
      throw new Error(`Failed to generate credentials: ${error.message}`);
    }
  }

  async saveLocalFile(file: Buffer, fileName: string, userId: number) {
    const uploadDir = path.join(process.cwd(), "uploads", userId.toString(), "imgs");
    await fs.promises.mkdir(uploadDir, { recursive: true });

    const name = path.basename(fileName);

    const filePath = path.join(uploadDir, name);
    return await fs.promises.writeFile(filePath, file);
  }
}
