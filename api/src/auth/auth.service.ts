import { HttpStatus, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { UserService } from "../user/user.service";
import { hash, verify } from "argon2";
import type { AuthJwtPayload } from "./types/auth-jwtPayload";
import { ApiException } from "@/_shared/model/api.exception";
import { JwtService } from "@nestjs/jwt";
import type { ConfigType } from "@nestjs/config";
import { RedisService } from "@/_shared/database/redis/redis.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { MailService } from "@/_shared/email/mail.service";
import { User } from "@prisma/client";
import { VerificationService } from "./verification.service";
import { ResetPasswordDto, RegisterDto, CreateOAuthUserDto } from "./auth.dto";
import { AuthResponse, ErrorCodeEnum, LoginResponseData, UserResponseData } from "shared";
import { DocumentService } from "@/document/ document.service";
import { jwtConfig, refreshJwtConfig } from "@/_shared/config/configs";
import { UserStatus } from "shared";
import { CollaborationService } from "@/collaboration/collaboration.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly verificationService: VerificationService,
    private readonly documentService: DocumentService,
    private readonly collaborationService: CollaborationService,
  ) {}

  @Inject(refreshJwtConfig.KEY)
  private readonly refreshJwtConfig: ConfigType<typeof refreshJwtConfig>;
  @Inject(jwtConfig.KEY)
  private readonly jwtConfig: ConfigType<typeof jwtConfig>;

  async register(data: RegisterDto) {
    let user = await this.userService.getUserByEmail(data.email);

    if (user) {
      if (user.status === UserStatus.ACTIVE) throw new ApiException(ErrorCodeEnum.UserAlreadyExists);

      await this.userService.updateUserStatus(data.email, UserStatus.SUSPENDED);
    } else {
      // Create new user and set status to 'pending'
      user = await this.userService.createUser({
        ...data,
        status: UserStatus.SUSPENDED, // Set user status to pending
      });
    }

    await this.verificationService.generateAndSendCode(data.email, "register");

    return {
      id: user.id,
      status: user.status,
      email: user.email,
    };
  }

  async loginUser(email: string): Promise<LoginResponseData> {
    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new ApiException(ErrorCodeEnum.AuthenticationFailed);
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ApiException(ErrorCodeEnum.UserNotActive);
    }

    const { accessToken, refreshToken } = await this.generateJWTToken(user.id);

    const hashedRefreshToken = await hash(refreshToken);

    await this.userService.updateHashedRefreshToken(user.id, hashedRefreshToken);

    const collabToken = await this.collaborationService.generateCollabToken(user.id);

    const userInfo = await this.userService.getUserById(user.id);

    if (!userInfo) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    return {
      user: {
        id: userInfo.id,
        email: userInfo.email,
        displayName: userInfo.displayName ?? undefined,
        imageUrl: userInfo.imageUrl ?? undefined,
        collabToken,
      },
      accessToken, // return to controller to set cookie
      refreshToken,
    };
  }

  async forgotPassword(_email: string) {
    const email = _email.toLowerCase();

    const user = await this.userService.getUserWithPassword(email);

    if (!user) throw new ApiException(ErrorCodeEnum.UserNotFound);

    if (user.status !== UserStatus.ACTIVE) throw new ApiException(ErrorCodeEnum.UserNotActive);

    await this.verificationService.generateAndSendCode(email, "reset-password");
    return {};
  }

  async resetUserPassword(data: ResetPasswordDto) {
    const email = data.email.toLowerCase();

    const user = await this.userService.getUserByEmail(email);
    if (!user) throw new ApiException(ErrorCodeEnum.UserNotFound);
    if (user.status !== UserStatus.ACTIVE) throw new ApiException(ErrorCodeEnum.UserNotActive);

    await this.userService.updateUserPassword(email, data.password);
    return {};
  }

  async sendRegistrationVerificationCode(email: string) {
    const code = await this.generateVerificationCode(email);
    return await this.mailService.sendRegistrationEmail(email, code);
  }

  private async generateVerificationCode(email: string): Promise<string> {
    const cooldownKey = `email:cooldown:${email}`;
    const isInCooldown = await this.redis.get(cooldownKey);

    if (isInCooldown) {
      throw new ApiException(ErrorCodeEnum.RequestTooFrequent);
    }

    const code = Math.random().toString().slice(2, 8);
    const codeKey = `email:code:${email}`;

    await this.redis.setex(codeKey, 300, code);
    await this.redis.setex(cooldownKey, 60, "1");

    return code;
  }

  async validateVerificationCode(email: string, code: string) {
    const codeKey = `email:code:${email}`;
    const storedCode = await this.redis.get(codeKey);

    if (!storedCode || storedCode !== code) {
      throw new ApiException(ErrorCodeEnum.VerificationCodeInvalid);
    }

    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    // Mark email as verified (10 minutes valid)
    const verifiedKey = `email:verified:${email}`;
    await this.redis.setex(verifiedKey, 600, "1");

    // Update user status to 'active'
    await this.userService.updateUserStatus(email, UserStatus.ACTIVE);

    return {};
  }

  async validateLocalUser(email: string, password: string) {
    const user = await this.userService.getUserWithPassword(email.toLowerCase());

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    if (!user.password) {
      const connection = await this.prisma.connection.findFirst({
        where: {
          userId: user.id,
        },
      });

      // After OAuth login, the account is not set
      if (connection) {
        throw new ApiException(ErrorCodeEnum.PasswordNotSet);
      }

      throw new ApiException(ErrorCodeEnum.AccountError);
    }

    const isPasswordValid = await verify(user.password.hash, password);

    if (!isPasswordValid) {
      throw new ApiException(ErrorCodeEnum.PasswordIncorrect);
    }

    return {
      id: user.id,
      email: user.email,
    };
  }

  async generateJWTToken(userId: number) {
    const payload: AuthJwtPayload = {
      sub: userId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, this.jwtConfig),
      this.jwtService.signAsync(payload, this.refreshJwtConfig),
    ]);

    return { accessToken, refreshToken };
  }

  async validateJWTToken(userId: number) {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    const currentUser = {
      id: user.id,
    };

    return currentUser;
  }

  async validateRefreshToken(userId: number, refreshToken: string) {
    const user = await this.userService.getUserById(userId);

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound, HttpStatus.UNAUTHORIZED);
    }

    if (!user.hashedRefreshToken) {
      throw new ApiException(ErrorCodeEnum.InvalidRefreshToken);
    }

    const isRefreshTokenValid = await verify(user.hashedRefreshToken, refreshToken);

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const currentUser = {
      id: user.id,
    };

    return currentUser;
  }

  async refreshToken(user: User): Promise<{ accessToken: string; refreshToken: string; user: UserResponseData }> {
    const { accessToken, refreshToken } = await this.generateJWTToken(user.id);

    const hashedRefreshToken = await hash(refreshToken);

    await this.userService.updateHashedRefreshToken(user.id, hashedRefreshToken);

    const userInfo = await this.userService.getUserById(user.id);

    if (!userInfo) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        ...(userInfo.displayName ? { displayName: userInfo.displayName } : {}),
        ...(userInfo.imageUrl ? { imageUrl: userInfo.imageUrl } : {}),
      },
    };
  }

  async logoutUser(userId: number) {
    await this.userService.updateHashedRefreshToken(userId, "");
    return {
      id: userId,
    };
  }

  async handleOAuthLogin(profile: CreateOAuthUserDto): Promise<AuthResponse> {
    const { providerName, providerId, email: originalEmail, displayName, imageUrl } = profile;

    try {
      const email = originalEmail.toLowerCase();

      if (!providerName || !providerId) {
        return {
          type: "ERROR",
          data: {
            error: {
              code: "INVALID_PROVIDER",
              message: "Invalid OAuth provider",
            },
          },
        };
      }

      // 1. check if the user has already connected with the provider
      const connection = await this.prisma.connection.findUnique({
        where: {
          providerName_providerId: {
            providerName,
            providerId,
          },
        },
        include: { user: true },
      });

      if (connection) {
        const { accessToken, refreshToken } = await this.generateJWTToken(connection.user.id);
        const collabToken = await this.collaborationService.generateCollabToken(connection.user.id);
        return {
          type: "EXISTING_USER",
          data: {
            user: {
              id: connection.user.id,
              email: connection.user.email,
              collabToken,
            },
            accessToken,
            refreshToken,
          },
        };
      }

      // 2. check if the email has already been used
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return {
          type: "EMAIL_CONFLICT",
          data: {
            user: {
              id: existingUser.id,
              email: existingUser.email,
              displayName: existingUser.displayName ?? undefined,
              imageUrl: existingUser.imageUrl ?? undefined,
            },
            error: {
              code: "EMAIL_CONFLICT",
              message: "Email already exists",
            },
          },
        };
      }

      // 3. new user, create new user and connection
      const newUser = await this.prisma.user.create({
        data: {
          email: email.toLowerCase(),
          displayName,
          imageUrl,
          status: UserStatus.ACTIVE,
          connections: {
            create: {
              providerName,
              providerId,
            },
          },
        },
      });

      await this.documentService.createDefault(newUser.id);

      const { accessToken, refreshToken } = await this.generateJWTToken(newUser.id);
      const collabToken = await this.collaborationService.generateCollabToken(newUser.id);

      return {
        type: "NEW_USER",
        data: {
          user: {
            id: newUser.id,
            email,
            displayName,
            collabToken,
          },
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      console.error("====handleOAuthLogin==== error", error);
      return {
        type: "ERROR",
        data: {
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
          },
        },
      };
    }
  }
}
