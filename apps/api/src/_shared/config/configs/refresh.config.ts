import { registerAs } from "@nestjs/config";

export const refreshJwtConfig = registerAs("refresh-jwt", () => ({
  secret: process.env.REFRESH_TOKEN_SECRET,
  expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
}));
