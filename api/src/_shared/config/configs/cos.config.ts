import { registerAs } from "@nestjs/config";

export const cosConfig = registerAs("cos", () => ({
  secretId: process.env.COS_SECRET_ID,
  secretKey: process.env.COS_SECRET_KEY,
  bucket: process.env.COS_BUCKET,
  region: process.env.COS_REGION,
  bucketUrl: process.env.COS_BUCKET_URL,
  appId: process.env.COS_APP_ID,
}));
