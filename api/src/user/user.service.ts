import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { hash } from "argon2";
import { ErrorCodeEnum } from "@/_shared/constants/error-code.constant";
import { ApiException } from "@/_shared/model/api.exception";
import { CreateUserDto, UpdateUserDto } from "@/auth/auth.dto";
import { UserStatus } from "shared";

@Injectable()
export class UserService {
  @Inject(PrismaService)
  private readonly prisma: PrismaService;

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
        throw new ConflictException(`User with this ${error.meta.target[0]} already exists`);
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
      throw new Error("User not found");
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
}
