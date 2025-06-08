import { Body, Controller, Delete, Get, Param, Post, Patch, Query } from "@nestjs/common";
import { UserPermissionService } from "./user-permission.service";
import { CreateUserPermissionDto, UpdateUserPermissionIndexDto, UserPermissionListDto } from "./user-permission.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";

/*

document和user-permission都有权限路由, 为什么需要两套路由
这种设计是因为权限管理有两个不同的视角：

文档管理者视角（documents 路由）：
"这个文档分享给了哪些用户？"
"给这个文档添加/移除某个用户的权限"
用户视角（userMemberships 路由）：
"我有权限访问哪些文档？"
"在我的 'Shared with me' 列表中重新排序"

*/
@Controller("/api/user-permissions")
export class UserPermissionController {
  constructor(private readonly userPermissionService: UserPermissionService) {}

  @Get()
  async list(@GetUser("id") userId: number, @Query() dto: UserPermissionListDto) {
    return this.userPermissionService.list(dto);
  }

  @Post()
  async create(@GetUser("id") userId: number, @Body() dto: CreateUserPermissionDto) {
    return this.userPermissionService.create(userId, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @GetUser("id") userId: number) {
    await this.userPermissionService.delete(id);
    return { success: true };
  }

  @Patch(":id/index")
  async updateIndex(@Param("id") id: string, @GetUser("id") userId: number, @Body() dto: UpdateUserPermissionIndexDto) {
    return this.userPermissionService.updateIndex(id, dto.index);
  }
}
