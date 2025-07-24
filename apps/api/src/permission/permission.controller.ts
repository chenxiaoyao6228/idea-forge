import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { ResourceType, PermissionLevel } from "@idea/contracts";
import { CheckPolicy } from "@/_shared/casl/policy.decorator";
import { AddUserPermissionDto, AddGroupPermissionDto, UpdatePermissionDto, PermissionListRequestDto } from "./permission.dto";
import { Action } from "@/_shared/casl/ability.class";
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
  @CheckPolicy(Action.ManagePermissions, "UnifiedPermission")
  async addUserPermission(@Body() dto: AddUserPermissionDto, @GetUser("id") adminId: string) {
    return await this.permissionService.assignUserPermission(dto.userId, dto.resourceType, dto.resourceId, dto.permission, adminId);
  }

  @Get("users")
  async getUserPermissions(@Query() query: PermissionListRequestDto, @GetUser("id") adminId: string) {
    return await this.permissionService.getUserPermissions(adminId, query);
  }

  @Post("groups")
  @CheckPolicy(Action.ManagePermissions, "UnifiedPermission")
  async addGroupPermission(@Body() dto: AddGroupPermissionDto, @GetUser("id") adminId: string) {
    return await this.permissionService.assignGroupPermissions(dto.groupId, dto.resourceType, dto.resourceId, dto.permission, adminId);
  }

  @Get("groups")
  async getGroupPermissions(@Query() query: PermissionListRequestDto, @GetUser("id") adminId: string) {
    return await this.permissionService.getGroupPermissions(adminId, query);
  }

  /*
    Unified Permission create method, here are some examples:

    POST /api/permissions/DOCUMENT/doc123
    Body: { "userId": "user456", "permission": "EDIT" }

    POST /api/permissions/WORKSPACE/workspace789  
    Body: { "groupId": "group123", "permission": "READ" }  

    POST /api/permissions/SUBSPACE/subspace456  
    Body: { "guestEmail": "guest@example.com", "permission": "COMMENT" } 
  */
  @Post(":resourceType/:resourceId")
  async assignPermission(
    @Param("resourceType") resourceType: ResourceType,
    @Param("resourceId") resourceId: string,
    @Body() dto: AssignPermissionDto,
    @GetUser("id") adminId: string,
  ) {
    if (dto.userId) {
      return await this.permissionService.assignUserPermission(dto.userId, resourceType, resourceId, dto.permission, adminId);
    }
    if (dto.groupId) {
      return await this.permissionService.assignGroupPermissions(dto.groupId, resourceType, resourceId, dto.permission, adminId);
    }
    if (dto.guestEmail) {
      return await this.permissionService.inviteGuestCollaborator(resourceId, dto.guestEmail, dto.permission, adminId);
    }
  }

  // Get resource permissions
  @Get("resources/:resourceType/:resourceId")
  async getResourcePermissions(@Param("resourceType") resourceType: ResourceType, @Param("resourceId") resourceId: string, @GetUser("id") userId: string) {
    return await this.permissionService.getResourcePermissionAbilities(resourceType, resourceId, userId);
  }

  // 解析用户对资源的最终权限
  /*
    Unified Permission resolve method, here are some examples:

    GET /api/permissions/resolve/DOCUMENT/doc123?guestId=guest123
    Response: { "permission": "EDIT" }

    GET /api/permissions/resolve/WORKSPACE/workspace789
    Response: { "permission": "READ" }

  */
  @Get("resolve/:resourceType/:resourceId")
  async resolvePermission(@Param("resourceType") resourceType: ResourceType, @Param("resourceId") resourceId: string, @GetUser("id") userId: string) {
    const permission = await this.permissionService.resolveUserPermission(userId, resourceType, resourceId);
    return { permission };
  }

  @Patch(":permissionId")
  @CheckPolicy(Action.ManagePermissions, "UnifiedPermission")
  async updatePermission(@Param("permissionId") permissionId: string, @Body() dto: UpdatePermissionDto) {
    return this.permissionService.updatePermission(permissionId, dto.permission);
  }

  @Delete(":permissionId")
  @CheckPolicy(Action.ManagePermissions, "UnifiedPermission")
  async removePermission(@Param("permissionId") permissionId: string) {
    return this.permissionService.removePermission(permissionId);
  }
}
