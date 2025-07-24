import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { UserService } from "./user.service";
import { UpdateUserDto, UserListRequestDto } from "./user.dto";

@Controller("/api/users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async searchUser(@Query() dto: UserListRequestDto) {
    const users = await this.userService.searchUser(dto);
    return users;
  }

  // ========== id related ==========

  @Get(":id")
  async getUserById(@Param("id") id: string) {
    const user = await this.userService.getUserById(id);
    return user;
  }

  @Put(":id")
  async updateUser(@Param("id") id: string, @Body() body: UpdateUserDto) {
    const user = await this.userService.updateUser(id, body);
    return user;
  }
}
