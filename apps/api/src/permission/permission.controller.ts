import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { PermissionLevel } from "@idea/contracts";
import { AddUserPermissionDto, AddGroupPermissionDto, UpdatePermissionDto, PermissionListRequestDto } from "./permission.dto";
import { PermissionService } from "./permission.service";

interface AssignPermissionDto {
  userId?: string;
  groupId?: string;
  guestEmail?: string;
  permission: PermissionLevel;
}

@Controller("api/permissions")
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post("users")
  async addUserPermission(@Body() dto: AddUserPermissionDto, @GetUser("id") adminId: string) {
    return await this.permissionService.assignUserPermission(dto.userId, dto.docId, dto.permission, adminId);
  }

  @Get("users")
  async getUserPermissions(@Query() query: PermissionListRequestDto, @GetUser("id") adminId: string) {
    return await this.permissionService.getUserPermissions(adminId, query);
  }

  @Post("groups")
  async addGroupPermission(@Body() dto: AddGroupPermissionDto, @GetUser("id") adminId: string) {
    return await this.permissionService.assignGroupPermissions(dto.groupId, dto.docId, dto.permission, adminId);
  }

  @Get("groups")
  async getGroupPermissions(@Query() query: PermissionListRequestDto, @GetUser("id") adminId: string) {
    return await this.permissionService.getGroupPermissions(adminId, query);
  }

  @Post(":docId")
  async assignPermission(@Param("docId") docId: string, @Body() dto: AssignPermissionDto, @GetUser("id") adminId: string) {
    if (dto.userId) {
      return await this.permissionService.assignUserPermission(dto.userId, docId, dto.permission, adminId);
    }
    if (dto.groupId) {
      return await this.permissionService.assignGroupPermissions(dto.groupId, docId, dto.permission, adminId);
    }
  }

  // Get resource permissions
  @Get("resources/:docId")
  async getResourcePermissions(@Param("docId") docId: string, @GetUser("id") userId: string) {
    return await this.permissionService.getResourcePermissionAbilities(docId, userId);
  }

  @Get("resolve/:docId")
  async resolvePermission(@Param("docId") docId: string, @GetUser("id") userId: string) {
    const permission = await this.permissionService.resolveUserPermission(userId, docId);
    return { permission };
  }

  @Patch(":permissionId")
  async updatePermission(@Param("permissionId") permissionId: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionService.updatePermission(permissionId, dto.permission);
  }

  @Delete(":permissionId")
  async removePermission(@Param("permissionId") permissionId: string) {
    return this.permissionService.removePermission(permissionId);
  }
}
