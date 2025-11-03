import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common";
import { StarService } from "./star.service";
import { CreateStarDto, ListStarDto, UpdateStarDto } from "./star.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";

@Controller("/api/stars")
export class StarController {
  constructor(private readonly starService: StarService) {}

  @Post()
  create(@Body() createStarDto: CreateStarDto, @GetUser("id") userId: string) {
    return this.starService.create(createStarDto, userId);
  }

  @Get()
  findAll(@GetUser("id") userId: string, @Query() listStarDto: ListStarDto) {
    return this.starService.findAll(userId, listStarDto.workspaceId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.starService.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateStarDto: UpdateStarDto, @GetUser("id") userId: string) {
    return this.starService.update(id, updateStarDto, userId);
  }

  @Delete(":id")
  remove(@Param("id") id: string, @GetUser("id") userId: string) {
    return this.starService.remove(id, userId);
  }
}
