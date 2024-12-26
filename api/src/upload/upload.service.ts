import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as COS from "cos-nodejs-sdk-v5";
import { v4 as uuidv4 } from "uuid";
import * as STS from "qcloud-cos-sts";

@Injectable()
export class CosService {
  private cos: COS;

  constructor(private configService: ConfigService) {
    this.cos = new COS({
      SecretId: this.configService.get("cos.secretId"),
      SecretKey: this.configService.get("cos.secretKey"),
    });
  }

  async generateUploadCredentials(userId: number, fileType: string) {
    const key = `uploads/${userId}/imgs/${uuidv4()}.${fileType}`;
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

  async getSignedUrl(key: string) {
    return new Promise((resolve, reject) => {
      const bucket = this.configService.get("cos.bucket");
      const region = this.configService.get("cos.region");
      const bucketUrl = this.configService.get("cos.bucketUrl");

      if (!bucket || !region || !bucketUrl) {
        reject(new Error("COS bucket or region not found"));
        return;
      }

      this.cos.getObjectUrl(
        {
          Bucket: bucket,
          Region: region,
          Key: key,
          Sign: true,
          Expires: 3600, // Signature expiration time in seconds
        },
        (err, data) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(data.Url);
        },
      );
    });
  }
}
