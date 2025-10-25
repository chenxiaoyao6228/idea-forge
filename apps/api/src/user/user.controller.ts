import { Body, Controller, Get, Param, Put, Query, Patch, Post } from "@nestjs/common";
import { UserService } from "./user.service";
import { UpdateUserDto, UserListRequestDto, SuggestMentionUsersDto } from "./user.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";

@Controller("/api/users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async searchUser(@Query() dto: UserListRequestDto) {
    const users = await this.userService.searchUser(dto);
    return users;
  }

  /**
   * Suggest users for mention autocomplete
   * POST /api/users/suggest-mentions
   */
  @Post("suggest-mentions")
  async suggestMentionUsers(@GetUser("id") userId: string, @Body() dto: SuggestMentionUsersDto) {
    const users = await this.userService.suggestMentionUsers(userId, dto);
    return { users };
  }

  // ========== id related ==========

  @Get(":id")
  async getUserById(@Param("id") id: string) {
    const user = await this.userService.getUserById(id);
    return user;
  }

  @Patch(":id")
  async updateUser(@Param("id") id: string, @Body() body: UpdateUserDto) {
    const user = await this.userService.updateUser(id, body);
    return user;
  }

  @Post(":id/regenerate-avatar")
  async regenerateAvatar(@Param("id") id: string, @Body() body: { seed?: string }) {
    const user = await this.userService.regenerateAvatar(id, body.seed);
    return user;
  }
}
