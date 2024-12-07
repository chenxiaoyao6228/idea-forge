import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt/dist/jwt.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserService } from "../user/user.service";
import { LocalStrategy } from "./strategies/strategy.local";
import { ConfigModule } from "@nestjs/config";
import { jwtConfig } from "./config/jwt.config";
import { JwtStrategy } from "./strategies/strategy.jwt";
import { refreshJwtConfig } from "./config/refresh.config";
import { RefreshTokenStrategy } from "./strategies/strategy.refresh-token";
import { googleOAuthConfig } from "./config/google.config";
import { GoogleStrategy } from "./strategies/strategy.google";
import { APP_GUARD } from "@nestjs/core";
import { githubOAuthConfig } from "./config/github.config";
import { GithubStrategy } from "./strategies/strategy.github";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { MailService } from "@/_shared/email/mail.service";
import { VerificationService } from "./verification.service";
import { DocumentService } from "@/document/ document.service";

@Module({
  // JwtModule.registerAsync(jwtConfig.asProvider()) - Asynchronously register JWT module using jwtConfig
  // Contains configuration for secret and signOptions (expiration time etc.)
  // ConfigModule.forFeature(jwtConfig) - Register jwtConfig as a configuration feature
  // Allows jwtConfig values to be injected throughout the module
  imports: [
    JwtModule.registerAsync(jwtConfig.asProvider()),
    ConfigModule.forFeature(jwtConfig),
    ConfigModule.forFeature(refreshJwtConfig),
    ConfigModule.forFeature(googleOAuthConfig),
    ConfigModule.forFeature(githubOAuthConfig),
  ],
  providers: [
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    RefreshTokenStrategy,
    GithubStrategy,
    VerificationService,
    AuthService,
    MailService,
    UserService,
    DocumentService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
