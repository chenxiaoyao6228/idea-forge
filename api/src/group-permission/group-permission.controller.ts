import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { GroupPermissionService } from "./group-permission.service";
import { CreateGroupPermissionDto, GroupPermissionListDto } from "./group-permission.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";

@Controller("/api/groups/:groupId/permissions")
export class GroupPermissionController {
  constructor(private readonly groupPermissionService: GroupPermissionService) {}

  @Get()
  async list(@Param("groupId") groupId: string, @GetUser("id") userId: number, @Query() dto: GroupPermissionListDto) {
    return this.groupPermissionService.list(dto);
  }

  @Post()
  async create(@Param("groupId") groupId: string, @GetUser("id") userId: number, @Body() dto: CreateGroupPermissionDto) {
    return this.groupPermissionService.create({
      ...dto,
      groupId,
    });
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Param("groupId") groupId: string, @GetUser("id") userId: number) {
    await this.groupPermissionService.delete(id);
    return { success: true };
  }
}
