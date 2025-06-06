import { Controller, Post, Body, Patch, Delete, Get, Param } from "@nestjs/common";
import { GroupService } from "./group.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { CreateGroupDto, UpdateGroupDto, GroupInfoDto, GroupListRequestDto, AddGroupUserDto, RemoveGroupUserDto } from "./group.dto";

@Controller("/api/groups")
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get(":id")
  async getGroupInfo(@Param("id") id: string, @GetUser("id") userId: number) {
    return this.groupService.getGroupInfo(userId, { id });
  }

  @Get()
  async listGroups(@GetUser("id") userId: number, @Body() dto: GroupListRequestDto) {
    return this.groupService.listGroups(userId, dto);
  }

  @Post()
  async createGroup(@GetUser("id") userId: number, @Body() dto: CreateGroupDto) {
    return this.groupService.createGroup(userId, dto);
  }

  @Patch(":id")
  async updateGroup(@Param("id") id: string, @GetUser("id") userId: number, @Body() dto: UpdateGroupDto) {
    return this.groupService.updateGroup(userId, { ...dto, id });
  }

  @Delete(":id")
  async deleteGroup(@Param("id") id: string, @GetUser("id") userId: number) {
    return this.groupService.deleteGroup(userId, { id });
  }

  @Post(":id/users")
  async addUserToGroup(@Param("id") id: string, @GetUser("id") userId: number, @Body() dto: AddGroupUserDto) {
    return this.groupService.addUserToGroup(userId, { ...dto, id });
  }

  @Delete(":id/users/:userId")
  async removeUserFromGroup(@Param("id") id: string, @Param("userId") targetUserId: number, @GetUser("id") userId: number) {
    return this.groupService.removeUserFromGroup(userId, { id, userId: targetUserId });
  }
}
