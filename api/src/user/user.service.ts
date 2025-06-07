import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { hash } from "argon2";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { CreateUserDto, UpdateUserDto } from "@/auth/auth.dto";
import { UserListRequestDto } from "contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { type ExtendedPrismaClient, PRISMA_CLIENT } from "@/_shared/database/prisma/prisma.extension";
import { UserStatus } from "@prisma/client";

@Injectable()
export class UserService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: ExtendedPrismaClient) {}

  async createUser(data: CreateUserDto) {
    const { password, ...userData } = data;

    const user = await this.prisma.user.create({
      data: {
        email: userData.email,
        status: userData.status,
      },
    });

    if (password) {
      await this.prisma.password.create({
        data: {
          hash: await hash(password),
          userId: user.id,
        },
      });
    }

    return user;
  }

  async getUserByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async getUserById(id: number) {
    return await this.prisma.user.findUnique({ where: { id } });
  }

  async getUserWithPassword(email: string) {
    return await this.prisma.user.findUnique({
      where: { email },
      include: { password: true },
    });
  }

  async updateUser(id: number, data: UpdateUserDto) {
    try {
      return await this.prisma.user.update({
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

  async updateHashedRefreshToken(id: number, hashedRefreshToken: string) {
    return await this.prisma.user.update({
      where: { id },
      data: { hashedRefreshToken },
    });
  }

  async updateUserStatus(email: string, status: UserStatus) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    return await this.prisma.user.update({
      where: { email },
      data: { status },
    });
  }

  async updateUserPassword(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { password: true },
    });

    if (!user) {
      throw new ApiException(ErrorCodeEnum.UserNotFound);
    }

    const hashedPassword = await hash(password);

    if (user.password) {
      // Update existing password
      return await this.prisma.password.update({
        where: { userId: user.id },
        data: { hash: hashedPassword },
      });
    }

    // Create new password
    return await this.prisma.password.create({
      data: {
        hash: hashedPassword,
        userId: user.id,
      },
    });
  }

  async searchUser(dto: UserListRequestDto) {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortOrder = "desc" } = dto;
    const skip = (page - 1) * limit;

    const where = query
      ? {
          OR: [{ email: { contains: query } }, { displayName: { contains: query } }],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      pagination: {
        page,
        limit,
        total,
      },
      data: users,
    };
  }
}
