import { registerAs } from "@nestjs/config";

export const githubOAuthConfig = registerAs("githubOAuth", () => ({
  clientId: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
}));
