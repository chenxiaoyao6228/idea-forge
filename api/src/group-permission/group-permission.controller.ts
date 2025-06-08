import { Controller, Get, Post, Delete, Body, Param, Query } from "@nestjs/common";
import { GroupPermissionService } from "./group-permission.service";
import { GroupPermissionPresenter } from "./group-permission.presenter";
import type { GroupPermissionDto, GroupPermissionListRequestDto } from "./group-permission.dto";
import type { GroupPermissionListResponse, GroupPermissionResponse } from "contracts";
import { GetUser } from "@/auth/decorators/get-user.decorator";

@Controller("api/group-permissions")
export class GroupPermissionController {
  constructor(
    private readonly groupPermissionService: GroupPermissionService,
    private readonly groupPermissionPresenter: GroupPermissionPresenter,
  ) {}

  @Get()
  async list(@Query() query: GroupPermissionListRequestDto): Promise<GroupPermissionListResponse> {
    const result = await this.groupPermissionService.list(query);
    return this.groupPermissionPresenter.toListResponse(result);
  }

  @Post()
  async create(@GetUser("id") userId: number, @Body() body: GroupPermissionDto): Promise<GroupPermissionResponse> {
    const result = await this.groupPermissionService.create(body, userId);
    return this.groupPermissionPresenter.toResponse(result);
  }

  @Delete(":id")
  async delete(@Param("id") id: string): Promise<void> {
    await this.groupPermissionService.delete(id);
  }
}
