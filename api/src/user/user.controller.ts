import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { UpdateUserDto } from "@/auth/auth.dto";

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
}
