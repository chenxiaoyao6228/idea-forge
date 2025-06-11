import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { ResourceType, PermissionLevel } from "@prisma/client";
import { PermissionInheritanceService } from "./permission-inheritance.service";

interface AssignPermissionDto {
  userId?: string;
  groupId?: string;
  guestEmail?: string;
  permission: PermissionLevel;
}

@Controller("api/permissions")
export class PermissionController {
  constructor(private readonly permissionService: PermissionInheritanceService) {}

  // 创建权限
  @Post(":resourceType/:resourceId")
  async assignPermission(
    @Param("resourceType") resourceType: ResourceType,
    @Param("resourceId") resourceId: string,
    @Body() dto: AssignPermissionDto,
    @GetUser("id") adminId: string,
  ) {
    // if (dto.userId) {
    //   return await this.permissionService.assignDocumentPermission(dto.userId, resourceId, dto.permission, adminId);
    // } else if (dto.groupId) {
    //   return await this.permissionService.assignGroupPermissions(dto.groupId, resourceType, resourceId, dto.permission, adminId);
    // } else if (dto.guestEmail) {
    //   return await this.permissionService.inviteGuestCollaborator(resourceId, dto.guestEmail, dto.permission, adminId);
    // }
  }

  // 获取资源权限列表
  @Get("resources/:resourceType/:resourceId")
  async getResourcePermissions(@Param("resourceType") resourceType: ResourceType, @Param("resourceId") resourceId: string, @GetUser("id") requesterId: string) {
    // return await this.permissionService.getResourcePermissions(resourceType, resourceId, requesterId);
  }

  // 解析用户对资源的最终权限
  @Get("resolve/:resourceType/:resourceId")
  async resolvePermission(
    @Param("resourceType") resourceType: ResourceType,
    @Param("resourceId") resourceId: string,
    @GetUser("id") userId: string,
    @Query("guestId") guestId?: string,
  ) {
    // const permission = await this.permissionService.resolveUserPermission(userId, resourceType, resourceId, guestId);
    // return { permission };
  }

  // 更新权限
  @Put(":permissionId")
  async updatePermission(@Param("permissionId") permissionId: string, @Body() dto: { permission: PermissionLevel }) {
    // return await this.permissionService.updatePermission(permissionId, dto.permission);
  }

  // 删除权限
  @Delete(":permissionId")
  async removePermission(@Param("permissionId") permissionId: string) {
    // await this.permissionService.removePermission(permissionId);
    // return { success: true };
  }
}
