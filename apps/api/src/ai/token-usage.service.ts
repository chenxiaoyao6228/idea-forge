import { Inject, Injectable } from "@nestjs/common";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { TokenUsageResponse } from "@idea/contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { UpdateUserTokenLimitDto } from "./ai.dto";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

const MONTHLY_TOKEN_LIMIT = 10000;

@Injectable()
export class TokenUsageService {
  constructor(private readonly prismaService: PrismaService) {}

  async updateTokenUsage(userId: string, usedTokens: number) {
    const usage = await this.getOrCreateTokenUsage(userId);

    // Check if we need to reset the monthly counter
    if (this.shouldResetUsage(usage.lastResetDate)) {
      await this.resetMonthlyUsage(userId);
      usage.tokensUsed = 0;
    }

    // Update token usage
    return this.prismaService.aITokenUsage.update({
      where: { userId },
      data: {
        tokensUsed: usage.tokensUsed + usedTokens,
      },
    });
  }

  private async getOrCreateTokenUsage(userId: string) {
    const usage = await this.prismaService.aITokenUsage.findUnique({
      where: { userId },
    });

    if (!usage) {
      return this.prismaService.aITokenUsage.create({
        data: {
          userId,
          tokensUsed: 0,
          monthlyLimit: MONTHLY_TOKEN_LIMIT,
        },
      });
    }

    return usage;
  }

  private shouldResetUsage(lastResetDate: Date): boolean {
    const now = new Date();
    const lastReset = new Date(lastResetDate);

    return now.getFullYear() !== lastReset.getFullYear() || now.getMonth() !== lastReset.getMonth();
  }

  private async resetMonthlyUsage(userId: string) {
    await this.prismaService.aITokenUsage.update({
      where: { userId },
      data: {
        tokensUsed: 0,
        lastResetDate: new Date(),
      },
    });
  }

  async getRemainingTokens(userId: string): Promise<number> {
    const usage = await this.getOrCreateTokenUsage(userId);

    if (this.shouldResetUsage(usage.lastResetDate)) {
      return usage.monthlyLimit;
    }

    return Math.max(0, usage.monthlyLimit - usage.tokensUsed);
  }

  async isTokenUsageExceeded(userId: string): Promise<boolean> {
    const usage = await this.getOrCreateTokenUsage(userId);
    return usage.tokensUsed >= usage.monthlyLimit;
  }

  async updateUserTokenLimit(dto: UpdateUserTokenLimitDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
      include: { aiTokenUsage: true },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    if (!user.aiTokenUsage) {
      return this.prismaService.aITokenUsage.create({
        data: {
          userId: user.id,
          monthlyLimit: dto.monthlyLimit,
          tokensUsed: dto.monthlyUsed,
        },
      });
    }

    return this.prismaService.aITokenUsage.update({
      where: { userId: user.id },
      data: { monthlyLimit: dto.monthlyLimit, tokensUsed: dto.monthlyUsed },
    });
  }

  async getUserTokenUsage(email: string): Promise<TokenUsageResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      include: { aiTokenUsage: true },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    return {
      email: user.email,
      monthlyLimit: user.aiTokenUsage?.monthlyLimit || 0,
      monthlyUsed: user.aiTokenUsage?.tokensUsed || 0,
      lastResetDate: user.aiTokenUsage?.lastResetDate || new Date(),
    };
  }
}
