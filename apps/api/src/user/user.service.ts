import { Injectable } from "@nestjs/common";
import { hash } from "argon2";
import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { CreateUserDto, UpdateUserDto } from "./user.dto";
import { UserListRequestDto } from "@idea/contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { Prisma } from "@prisma/client";
import { UserStatus } from "@idea/contracts";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Generate avatar using DiceBear notionists style
   */
  generateAvatar(seed: string): string {
    const avatar = createAvatar(notionists, {
      seed,
      size: 128,
    });
    const svg = avatar.toString();
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }

  async createUser(data: CreateUserDto) {
    const { password, email, status } = data;

    // Generate default avatar using DiceBear notionists
    const defaultAvatar = this.generateAvatar(email);

    const user = await this.prismaService.user.create({
      data: {
        email,
        status,
        imageUrl: defaultAvatar,
      },
    });

    if (password) {
      await this.prismaService.password.create({
        data: {
          hash: await hash(password),
          userId: user.id,
        },
      });
    }

    return user;
  }

  async getUserByEmail(email: string) {
    return await this.prismaService.user.findUnique({ where: { email } });
  }

  async getUserById(id: string) {
    return await this.prismaService.user.findUnique({ where: { id } });
  }

  async getUserWithPassword(email: string) {
    return await this.prismaService.user.findUnique({
      where: { email },
      include: { password: true },
    });
  }

  async updateUser(id: string, data: UpdateUserDto) {
    try {
      return await this.prismaService.user.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        throw new ApiException(ErrorCodeEnum.UserAlreadyExists);
      }
      throw error;
    }
  }

  async regenerateAvatar(id: string, seed?: string) {
    const user = await this.getUserById(id);
    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    // Use provided seed or default to user's email
    const avatarSeed = seed || user.email;
    const newAvatar = this.generateAvatar(avatarSeed);

    const newUser = await this.updateUser(id, { imageUrl: newAvatar });

    return {
      data: newUser,
    };
  }

  async updateHashedRefreshToken(id: string, hashedRefreshToken: string) {
    return await this.prismaService.user.update({
      where: { id },
      data: { hashedRefreshToken },
    });
  }

  async updateUserStatus(email: string, status: UserStatus) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    return await this.prismaService.user.update({
      where: { email },
      data: { status },
    });
  }

  async updateUserPassword(email: string, password: string) {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      include: { password: true },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    const hashedPassword = await hash(password);

    if (user.password) {
      // Update existing password
      return await this.prismaService.password.update({
        where: { userId: user.id },
        data: { hash: hashedPassword },
      });
    }

    // Create new password
    return await this.prismaService.password.create({
      data: {
        hash: hashedPassword,
        userId: user.id,
      },
    });
  }

  async checkPasswordStatus(userId: string): Promise<{ hasPassword: boolean }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: { password: true },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    return { hasPassword: !!user.password };
  }

  async searchUser(dto: UserListRequestDto) {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortOrder = "desc" } = dto;
    const where: Prisma.UserWhereInput = {
      status: UserStatus.ACTIVE,
      ...(query
        ? {
            OR: [{ email: { contains: query, mode: Prisma.QueryMode.insensitive } }, { displayName: { contains: query, mode: Prisma.QueryMode.insensitive } }],
          }
        : {}),
    };

    try {
      // FIXME:
      const { data, pagination } = await (this.prismaService.user as any).paginateWithApiFormat({
        where,
        orderBy: [{ [sortBy]: sortOrder }, { email: "asc" }],
        page,
        limit,
      });

      return {
        pagination,
        data: data.map((user) => ({
          ...user,
          id: user.id.toString(),
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        })),
      };
    } catch (error) {
      console.error("Error searching users:", error);
      throw new ApiException(ErrorCodeEnum.AccountError);
    }
  }
}
