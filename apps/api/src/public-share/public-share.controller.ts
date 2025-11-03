import { Controller, Post, Get, Patch, Delete, Body, Param, Query, Req, NotFoundException, Header } from "@nestjs/common";
import { PublicShareService } from "./public-share.service";
import { GetOrCreateShareDto, UpdateShareDto, ListSharesDto } from "./public-share.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { Public } from "@/auth/decorators/public.decorator";

@Controller()
export class PublicShareController {
  constructor(private readonly publicShareService: PublicShareService) {}

  // ==================== Public Access Routes (No Auth) ====================
  // IMPORTANT: These must come BEFORE authenticated routes to avoid route conflicts
  // because /api/share/:token matches the same pattern as /api/share/:id

  @Public()
  @Get("api/share/:token/doc/:documentId")
  async getPublicNestedDocument(@Param("token") token: string, @Param("documentId") documentId: string, @Req() request: any) {
    return this.publicShareService.getPublicNestedDocument(token, documentId, request);
  }

  @Public()
  @Get("api/share/:tokenOrSlug")
  async getPublicDocument(@Param("tokenOrSlug") tokenOrSlug: string, @Req() request: any) {
    return this.publicShareService.getPublicDocument(tokenOrSlug, request);
  }

  // ==================== Authenticated Routes ====================

  @Post("api/share")
  async getOrCreateShare(@GetUser("id") userId: string, @Body() dto: GetOrCreateShareDto) {
    return this.publicShareService.getOrCreateShare(userId, dto);
  }

  @Patch("api/share/:id")
  async updateShare(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: UpdateShareDto) {
    return this.publicShareService.updateShare(userId, id, dto);
  }

  @Delete("api/share/:id")
  async revokeShare(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.publicShareService.revokeShare(userId, { id });
  }

  @Get("api/share")
  async listShares(@GetUser("id") userId: string, @Query() dto: ListSharesDto) {
    return this.publicShareService.listShares(userId, dto);
  }

  @Get("api/share/:id")
  async getShareById(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.publicShareService.getShareById(userId, id);
  }

  @Get("api/share/doc/:docId")
  async getShareByDocId(@GetUser("id") userId: string, @Param("docId") docId: string) {
    return this.publicShareService.getShareByDocId(userId, docId);
  }

  @Patch("api/share/doc/:docId")
  async updateShareByDocId(@GetUser("id") userId: string, @Param("docId") docId: string, @Body() dto: UpdateShareDto) {
    // Get share by docId first
    const share = await this.publicShareService.getShareByDocId(userId, docId);
    if (!share) {
      throw new NotFoundException("Share not found");
    }
    return this.publicShareService.updateShare(userId, share.id, dto);
  }

  @Delete("api/share/doc/:docId")
  async revokeShareByDocId(@GetUser("id") userId: string, @Param("docId") docId: string) {
    // Get share by docId first
    const share = await this.publicShareService.getShareByDocId(userId, docId);
    if (!share) {
      throw new NotFoundException("Share not found");
    }
    return this.publicShareService.revokeShare(userId, { id: share.id });
  }
}
