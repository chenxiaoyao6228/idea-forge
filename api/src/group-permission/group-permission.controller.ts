import { Controller, Get, Post, Delete, Body, Param, Query } from "@nestjs/common";
import { GroupPermissionService } from "./group-permission.service";
import type { GroupPermissionDto, GroupPermissionListRequestDto } from "./group-permission.dto";
import type { GroupPermissionListResponse, GroupPermissionResponse } from "contracts";
import { GetUser } from "@/auth/decorators/get-user.decorator";

@Controller("api/group-permissions")
export class GroupPermissionController {
  constructor(private readonly groupPermissionService: GroupPermissionService) {}

  @Get()
  async list(@Query() query: GroupPermissionListRequestDto): Promise<GroupPermissionListResponse> {
    return this.groupPermissionService.list(query);
  }

  @Post()
  async create(@GetUser("id") userId: string, @Body() body: GroupPermissionDto): Promise<GroupPermissionResponse> {
    return this.groupPermissionService.create(body, userId);
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<void> {
    await this.groupPermissionService.delete(id);
  }
}
