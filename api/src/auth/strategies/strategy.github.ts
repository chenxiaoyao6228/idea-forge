import { Inject, Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { type Profile, Strategy } from "passport-github2";
import type { ConfigService, ConfigType } from "@nestjs/config";
import { githubOAuthConfig } from "../config/github.config";
import { AuthService } from "../auth.service";
import { Provider, UserStatus } from "@prisma/client";

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, "github") {
  constructor(
    @Inject(githubOAuthConfig.KEY)
    private readonly githubOAuthConfiguration: ConfigType<
      typeof githubOAuthConfig
    >
  ) {
    super({
      clientID: githubOAuthConfiguration.clientId,
      clientSecret: githubOAuthConfiguration.clientSecret,
      callbackURL: githubOAuthConfiguration.callbackURL,
      scope: ["user:email"],
    });
  }

  @Inject(AuthService)
  private authService: AuthService;

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    console.log("github profile:", profile);

    const email = profile.emails?.[0]?.value ?? "";
    const displayName = profile.displayName || profile.displayName || email;
    const imageUrl = profile.photos?.[0]?.value ?? "";
    const providerId = profile.id;

    const user = {
      email,
      displayName,
      password: "",
      imageUrl,
      providerId,
      providerName: Provider.github,
      status: UserStatus.ACTIVE,
    };

    return user;

    // 1. Calling done(null, user) will pass the user object to Passport.js validation flow
    // 2. In JWT strategy, session storage is not used, instead JWT token is generated
    // 3. The user object will also be attached to req.user for middleware and route access
    // 4. The request will then flow to routes decorated with @UseGuards(GithubAuthGuard)
    // 5. In this case it's the /github/callback route in auth.controller.ts
    // 6. That route can access the user object passed here via req.user
    // 7. Finally authService.handleOAuthLogin handles login logic and generates JWT token
  }
}
