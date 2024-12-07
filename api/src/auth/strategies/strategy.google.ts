import { Strategy as PassportGoogleStrategy, type Profile } from "passport-google-oauth20";
import { PassportStrategy } from "@nestjs/passport";

import { Inject } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { googleOAuthConfig } from "../config/google.config";
import type { ConfigType } from "@nestjs/config";
import { Provider, UserStatus } from "@prisma/client";

export class GoogleStrategy extends PassportStrategy(PassportGoogleStrategy) {
  constructor(
    @Inject(googleOAuthConfig.KEY)
    private readonly googleOAuthConfiguration: ConfigType<typeof googleOAuthConfig>,
  ) {
    super({
      clientID: googleOAuthConfiguration.clientId,
      clientSecret: googleOAuthConfiguration.clientSecret,
      callbackURL: googleOAuthConfiguration.callbackURL,
      scope: ["email", "profile"],
    });
  }

  @Inject(AuthService)
  private authService: AuthService;

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    console.log("google profile:", profile);

    const user = {
      email: profile.emails?.[0]?.value ?? "",
      displayName: profile.displayName,
      password: "",
      imageUrl: profile.photos?.[0]?.value ?? "",
      status: UserStatus.ACTIVE,
      providerId: profile.id,
      providerName: Provider.google,
    };

    return user;
  }
}
