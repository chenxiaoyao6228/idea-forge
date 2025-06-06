import { Controller, Post, Body, Get, Patch, Delete, Param, Query } from "@nestjs/common";
import { DocShareService } from "./doc-share.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { CreateShareDto, UpdateShareDto, ShareListRequestDto, ListSharedWithMeDto, ListSharedByMeDto } from "./doc-share.dto";

@Controller("/api/shares")
export class DocShareController {
  constructor(private readonly docShareService: DocShareService) {}

  @Get(":id")
  async getShareInfo(@Param("id") id: string, @GetUser("id") userId: number) {
    return this.docShareService.getShareInfo(userId, { id });
  }

  @Get()
  async listShares(@GetUser("id") userId: number, @Query() dto: ShareListRequestDto) {
    return this.docShareService.listShares(userId, dto);
  }

  @Post()
  async createShare(@GetUser("id") userId: number, @Body() dto: CreateShareDto) {
    return this.docShareService.createShare(userId, dto);
  }

  @Patch(":id")
  async updateShare(@Param("id") id: string, @GetUser("id") userId: number, @Body() dto: UpdateShareDto) {
    return this.docShareService.updateShare(userId, { ...dto, id });
  }

  @Delete(":id")
  async revokeShare(@Param("id") id: string, @GetUser("id") userId: number) {
    return this.docShareService.revokeShare(userId, { id });
  }

  @Get("shared-with-me")
  async listSharedWithMe(@GetUser("id") userId: number, @Query() dto: ListSharedWithMeDto) {
    return this.docShareService.listSharedWithMe(userId, dto);
  }

  @Get("shared-by-me")
  async listSharedByMe(@GetUser("id") userId: number, @Query() dto: ListSharedByMeDto) {
    return this.docShareService.listSharedByMe(userId, dto);
  }
}
