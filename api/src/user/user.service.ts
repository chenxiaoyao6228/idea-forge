import { Injectable } from "@nestjs/common";
import { hash } from "argon2";
import { ApiException } from "@/_shared/exceptions/api.exception";
import { CreateUserDto, UpdateUserDto } from "@/auth/auth.dto";
import { UserListRequestDto } from "contracts";
import { ErrorCodeEnum } from "@/_shared/constants/api-response-constant";
import { UserStatus, Prisma } from "@prisma/client";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  async createUser(data: CreateUserDto) {
    const { password, email, status } = data;

    const user = await this.prismaService.user.create({
      data: {
        email,
        status,
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

  async searchUser(dto: UserListRequestDto) {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortOrder = "desc" } = dto;
    const skip = (page - 1) * Number(limit);
    const take = Number(limit);

    const where: Prisma.UserWhereInput = {
      status: UserStatus.ACTIVE,
      ...(query
        ? {
            OR: [{ email: { contains: query, mode: Prisma.QueryMode.insensitive } }, { displayName: { contains: query, mode: Prisma.QueryMode.insensitive } }],
          }
        : {}),
    };

    try {
      const [users, total] = await Promise.all([
        this.prismaService.user.findMany({
          where,
          skip,
          take,
          orderBy: {
            [sortBy]: sortOrder,
          },
          select: {
            id: true,
            email: true,
            imageUrl: true,
            displayName: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prismaService.user.count({ where }),
      ]);

      return {
        pagination: {
          page,
          limit: take,
          total,
        },
        data: users.map((user) => ({
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
