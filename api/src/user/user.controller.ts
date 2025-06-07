import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";
import { UserService } from "./user.service";
import { UpdateUserDto } from "./user.dto";
import { UserListRequestDto } from "contracts";

@Controller("/api/user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(":id")
  async getUserById(@Param("id") id: string) {
    const user = await this.userService.getUserById(Number.parseInt(id));
    return user;
  }

  @Put(":id")
  async updateUser(@Param("id") id: string, @Body() body: UpdateUserDto) {
    const user = await this.userService.updateUser(Number.parseInt(id), body);
    return user;
  }

  @Get("search")
  async searchUser(@Query() dto: UserListRequestDto) {
    const users = await this.userService.searchUser(dto);
    return users;
  }
}
