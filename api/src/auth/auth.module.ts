import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt/dist/jwt.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { UserService } from "../user/user.service";
import { LocalStrategy } from "./strategies/strategy.local";
import { jwtConfig } from "@/_shared/config/configs";
import { JwtStrategy } from "./strategies/strategy.jwt";
import { RefreshTokenStrategy } from "./strategies/strategy.refresh-token";
import { GoogleStrategy } from "./strategies/strategy.google";
import { APP_GUARD } from "@nestjs/core";
import { GithubStrategy } from "./strategies/strategy.github";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { MailService } from "@/_shared/email/mail.service";
import { VerificationService } from "./verification.service";
import { DocumentService } from "@/document/ document.service";
import { JwtService } from "@nestjs/jwt";

@Module({
  // JwtModule.registerAsync(jwtConfig.asProvider()) - Asynchronously register JWT module using jwtConfig
  // Contains configuration for secret and signOptions (expiration time etc.)
  // ConfigModule.forFeature(jwtConfig) - Register jwtConfig as a configuration feature
  // Allows jwtConfig values to be injected throughout the module
  imports: [JwtModule.registerAsync(jwtConfig.asProvider())],
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
    JwtService,
    DocumentService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, VerificationService, JwtService],
})
export class AuthModule {}
