import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { UserPermissionService } from "./user-permission.service";
import { CreateUserPermissionDto, UserPermissionListDto } from "./user-permission.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";

@Controller("/api/users/:userId/permissions")
export class UserPermissionController {
  constructor(private readonly userPermissionService: UserPermissionService) {}

  @Get()
  async list(@Param("userId") userId: string, @GetUser("id") currentUserId: number, @Query() dto: UserPermissionListDto) {
    return this.userPermissionService.list(dto);
  }

  @Post()
  async create(@Param("userId") userId: string, @GetUser("id") currentUserId: number, @Body() dto: CreateUserPermissionDto) {
    return this.userPermissionService.create({
      ...dto,
      userId,
    });
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Param("userId") userId: string, @GetUser("id") currentUserId: number) {
    await this.userPermissionService.delete(id);
    return { success: true };
  }
}
