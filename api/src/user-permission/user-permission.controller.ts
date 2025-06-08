import { Body, Controller, Delete, Get, Param, Post, Patch, Query } from "@nestjs/common";
import { UserPermissionService } from "./user-permission.service";
import { CreateUserPermissionDto, UpdateUserPermissionIndexDto, UserPermissionListDto } from "./user-permission.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";

/*

Why do both documents and user-permissions have permission routes? 
This design exists because permission management has two different perspectives:

Document Manager's View (documents routes):
"Which users have this document been shared with?"
"Add/remove permissions for a user on this document"

User's View (userMemberships routes): 
"Which documents do I have access to?"
"Reorder items in my 'Shared with me' list"

*/
@Controller("/api/user-permissions")
export class UserPermissionController {
  constructor(private readonly userPermissionService: UserPermissionService) {}

  @Get()
  async list(@GetUser("id") userId: string, @Query() dto: UserPermissionListDto) {
    return this.userPermissionService.list(dto);
  }

  @Post()
  async create(@GetUser("id") userId: string, @Body() dto: CreateUserPermissionDto) {
    return this.userPermissionService.create(userId, dto);
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @GetUser("id") userId: string) {
    await this.userPermissionService.delete(id);
    return { success: true };
  }

  @Patch(":id/index")
  async updateIndex(@Param("id") id: string, @GetUser("id") userId: string, @Body() dto: UpdateUserPermissionIndexDto) {
    return this.userPermissionService.updateIndex(id, dto.index);
  }
}
