import { Inject, Injectable } from "@nestjs/common";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { TokenUsageResponse } from "contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { UpdateUserTokenLimitDto } from "./ai.dto";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";

const MONTHLY_TOKEN_LIMIT = 10000;

@Injectable()
export class TokenUsageService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  async updateTokenUsage(userId: number, usedTokens: number) {
    const usage = await this.getOrCreateTokenUsage(userId);

    // Check if we need to reset the monthly counter
    if (this.shouldResetUsage(usage.lastResetDate)) {
      await this.resetMonthlyUsage(userId);
      usage.tokensUsed = 0;
    }

    // Update token usage
    return this.prisma.aITokenUsage.update({
      where: { userId },
      data: {
        tokensUsed: usage.tokensUsed + usedTokens,
      },
    });
  }

  private async getOrCreateTokenUsage(userId: number) {
    const usage = await this.prisma.aITokenUsage.findUnique({
      where: { userId },
    });

    if (!usage) {
      return this.prisma.aITokenUsage.create({
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

  private async resetMonthlyUsage(userId: number) {
    await this.prisma.aITokenUsage.update({
      where: { userId },
      data: {
        tokensUsed: 0,
        lastResetDate: new Date(),
      },
    });
  }

  async getRemainingTokens(userId: number): Promise<number> {
    const usage = await this.getOrCreateTokenUsage(userId);

    if (this.shouldResetUsage(usage.lastResetDate)) {
      return usage.monthlyLimit;
    }

    return Math.max(0, usage.monthlyLimit - usage.tokensUsed);
  }

  async isTokenUsageExceeded(userId: number): Promise<boolean> {
    const usage = await this.getOrCreateTokenUsage(userId);
    return usage.tokensUsed >= usage.monthlyLimit;
  }

  async updateUserTokenLimit(dto: UpdateUserTokenLimitDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { aiTokenUsage: true },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    if (!user.aiTokenUsage) {
      return this.prisma.aITokenUsage.create({
        data: {
          userId: user.id,
          monthlyLimit: dto.monthlyLimit,
          tokensUsed: dto.monthlyUsed,
        },
      });
    }

    return this.prisma.aITokenUsage.update({
      where: { userId: user.id },
      data: { monthlyLimit: dto.monthlyLimit, tokensUsed: dto.monthlyUsed },
    });
  }

  async getUserTokenUsage(email: string): Promise<TokenUsageResponse> {
    const user = await this.prisma.user.findUnique({
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
