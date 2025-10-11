import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, NotFoundException, Header } from "@nestjs/common";
import { PublicShareService } from "./public-share.service";
import { GetOrCreateShareDto, UpdateShareDto, ListSharesDto } from "./public-share.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { Public } from "@/auth/decorators/public.decorator";

@Controller()
export class PublicShareController {
  constructor(private readonly publicShareService: PublicShareService) {}

  // ==================== Authenticated Routes ====================

  @Post("api/public-shares")
  async getOrCreateShare(@GetUser("id") userId: string, @Body() dto: GetOrCreateShareDto) {
    return this.publicShareService.getOrCreateShare(userId, dto);
  }

  @Patch("api/public-shares/:id")
  async updateShare(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: UpdateShareDto) {
    return this.publicShareService.updateShare(userId, id, dto);
  }

  @Delete("api/public-shares/:id")
  async revokeShare(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.publicShareService.revokeShare(userId, { id });
  }

  @Get("api/public-shares")
  async listShares(@GetUser("id") userId: string, @Query() dto: ListSharesDto) {
    return this.publicShareService.listShares(userId, dto);
  }

  @Get("api/public-shares/:id")
  async getShareById(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.publicShareService.getShareById(userId, id);
  }

  @Get("api/public-shares/doc/:docId")
  async getShareByDocId(@GetUser("id") userId: string, @Param("docId") docId: string) {
    return this.publicShareService.getShareByDocId(userId, docId);
  }

  @Patch("api/public-shares/doc/:docId")
  async updateShareByDocId(@GetUser("id") userId: string, @Param("docId") docId: string, @Body() dto: UpdateShareDto) {
    // Get share by docId first
    const share = await this.publicShareService.getShareByDocId(userId, docId);
    if (!share) {
      throw new NotFoundException("Share not found");
    }
    return this.publicShareService.updateShare(userId, share.id, dto);
  }

  @Delete("api/public-shares/doc/:docId")
  async revokeShareByDocId(@GetUser("id") userId: string, @Param("docId") docId: string) {
    // Get share by docId first
    const share = await this.publicShareService.getShareByDocId(userId, docId);
    if (!share) {
      throw new NotFoundException("Share not found");
    }
    return this.publicShareService.revokeShare(userId, { id: share.id });
  }

  // ==================== Public Access Routes (No Auth) ====================

  @Public()
  @Get("api/public/:tokenOrSlug")
  async getPublicDocument(@Param("tokenOrSlug") tokenOrSlug: string, @Req() request: any) {
    return this.publicShareService.getPublicDocument(tokenOrSlug, request);
  }

  @Public()
  @Get("api/public/:token/doc/:documentId")
  async getPublicNestedDocument(@Param("token") token: string, @Param("documentId") documentId: string, @Req() request: any) {
    return this.publicShareService.getPublicNestedDocument(token, documentId, request);
  }
}
