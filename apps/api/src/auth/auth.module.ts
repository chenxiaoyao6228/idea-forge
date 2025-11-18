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
import { JwtService } from "@nestjs/jwt";
import { FileService } from "@/file-store/file-store.service";
import { FileStoreModule } from "../file-store/file-store.module";
import { CollaborationModule } from "@/collaboration/collaboration.module";
import { LoggerModule } from "@/_shared/utils/logger.module";
import { SystemDocumentService } from "@/document/system-document.service";
import { WsJwtStrategy } from "./strategies/strategy.ws-jwt";
import { DocumentModule } from "@/document/document.module";
import { WorkspaceModule } from "@/workspace/workspace.module";

@Module({
  // JwtModule.registerAsync(jwtConfig.asProvider()) - Asynchronously register JWT module using jwtConfig
  // Contains configuration for secret and signOptions (expiration time etc.)
  // ConfigModule.forFeature(jwtConfig) - Register jwtConfig as a configuration feature
  // Allows jwtConfig values to be injected throughout the module
  imports: [JwtModule.registerAsync(jwtConfig.asProvider()), FileStoreModule, CollaborationModule, LoggerModule, DocumentModule, WorkspaceModule],
  providers: [
    WsJwtStrategy,
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
    SystemDocumentService,
    FileService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtService, VerificationService],
})
export class AuthModule {}
