import { Controller, Post, Body } from "@nestjs/common";
import { DocShareService } from "./doc-share.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { DocShareInfoDto, CreateShareDto, UpdateShareDto, RevokeShareDto, ShareListRequestDto, ListSharedWithMeDto, ListSharedByMeDto } from "./doc-share.dto";

@Controller("/api/shares")
export class DocShareController {
  constructor(private readonly docShareService: DocShareService) {}

  @Post("info")
  async getShareInfo(@GetUser("id") userId: number, @Body() dto: DocShareInfoDto) {
    return this.docShareService.getShareInfo(userId, dto);
  }

  @Post("list")
  async listShares(@GetUser("id") userId: number, @Body() dto: ShareListRequestDto) {
    return this.docShareService.listShares(userId, dto);
  }

  @Post("create")
  async createShare(@GetUser("id") userId: number, @Body() dto: CreateShareDto) {
    return this.docShareService.createShare(userId, dto);
  }

  @Post("update")
  async updateShare(@GetUser("id") userId: number, @Body() dto: UpdateShareDto) {
    return this.docShareService.updateShare(userId, dto);
  }

  @Post("revoke")
  async revokeShare(@GetUser("id") userId: number, @Body() dto: RevokeShareDto) {
    return this.docShareService.revokeShare(userId, dto);
  }

  @Post("sharedWithMe")
  async listSharedWithMe(@GetUser("id") userId: number, @Body() dto: ListSharedWithMeDto) {
    return this.docShareService.listSharedWithMe(userId, dto);
  }

  @Post("sharedByMe")
  async listSharedByMe(@GetUser("id") userId: number, @Body() dto: ListSharedByMeDto) {
    return this.docShareService.listSharedByMe(userId, dto);
  }
}
