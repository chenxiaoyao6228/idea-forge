import { Injectable, Inject } from "@nestjs/common";
import { RedisService } from "@/_shared/database/redis/redis.service";
import { MailService } from "@/_shared/email/mail.service";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { UserService } from "@/user/user.service";
import { DocumentService } from "@/document/document.service";
import { VerificationCodeType } from "@idea/contracts";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { Logger } from "winston";
import { UserStatus } from "@idea/contracts";

interface VerificationCodeConfig {
  codeExpiry: number;
  cooldown: number;
}

@Injectable()
export class VerificationService {
  private readonly CODE_TYPE_CONFIG: Record<VerificationCodeType, VerificationCodeConfig> = {
    register: { codeExpiry: 300, cooldown: 60 },
    "reset-password": { codeExpiry: 300, cooldown: 60 },
    "change-email": { codeExpiry: 300, cooldown: 60 },
    "2fa": { codeExpiry: 120, cooldown: 30 },
  };

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redis: RedisService,
    private readonly mailService: MailService,
    private readonly userService: UserService,
    private readonly documentService: DocumentService,
  ) {}

  async generateAndSendCode(email: string, type: VerificationCodeType) {
    try {
      const config = this.CODE_TYPE_CONFIG[type];
      const cooldownKey = this.getCooldownKey(email, type);
      const isInCooldown = await this.redis.get(cooldownKey);

      if (isInCooldown) {
        this.logger.warn(`Rate limit exceeded for email ${email} and type ${type}`, {
          email,
          type,
          cooldownKey,
        });
        throw new ApiException(ErrorCodeEnum.RequestTooFrequent);
      }

      const code = Math.random().toString().slice(2, 8);
      const codeKey = this.getCodeKey(email, type);

      await this.sendVerificationEmail(email, code, type);

      await this.redis.setex(codeKey, config.codeExpiry, code);
      await this.redis.setex(cooldownKey, config.cooldown, "1");

      return code;
    } catch (error) {
      this.logger.error(`Failed to send verification code`, {
        email,
        type,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw new ApiException(ErrorCodeEnum.SendEmailError);
    }
  }

  async validateCode(email: string, code: string, type: VerificationCodeType) {
    const codeKey = this.getCodeKey(email, type);
    const storedCode = await this.redis.get(codeKey);

    if (!storedCode || storedCode !== code) {
      throw new ApiException(ErrorCodeEnum.VerificationCodeInvalid);
    }

    const user = await this.userService.getUserByEmail(email);

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    await this.redis.del(codeKey);

    switch (type) {
      case "register":
        await this.userService.updateUserStatus(email, UserStatus.ACTIVE);
        // FIXME: better organize this
        // await this.documentService.createDefault(user.id);
        break;
      default:
        break;
    }

    return true;
  }

  private async sendVerificationEmail(email: string, code: string, type: VerificationCodeType) {
    switch (type) {
      case "register":
        return this.mailService.sendRegistrationEmail(email, code);
      case "reset-password":
        return this.mailService.sendPasswordResetEmail(email, code);
      //   case "change-email":
      //     return this.mailService.sendEmailChangeVerification(email, code);
      //   case "2fa":
      //     return this.mailService.send2FACode(email, code);
    }
  }

  private getCodeKey(email: string, type: VerificationCodeType): string {
    return `email:code:${type}:${email}`;
  }

  private getCooldownKey(email: string, type: VerificationCodeType): string {
    return `email:cooldown:${type}:${email}`;
  }
}
