import { Controller, Get, Post, Body, Patch, Param, Delete } from "@nestjs/common";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { RemoveShareDto, ShareDocumentDto, UpdateSharePermissionDto } from "@idea/contracts";
import { ShareDocumentService } from "./share-document.services";

@Controller("/api/share-documents")
export class ShareDocumentController {
  constructor(private readonly shareDocumentService: ShareDocumentService) {}

  @Get("shared-docs")
  async getSharedDocuments(@GetUser("id") userId: string) {
    return this.shareDocumentService.getSharedDocuments(userId);
  }

  @Get(":id")
  getDocShares(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.shareDocumentService.getDocShares(id, userId);
  }

  @Post()
  async shareDocument(@GetUser("id") userId: string, @Body() dto: ShareDocumentDto) {
    return this.shareDocumentService.shareDocument(userId, dto);
  }

  @Patch(":id")
  async updateSharePermission(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: UpdateSharePermissionDto) {
    return this.shareDocumentService.updateSharePermission(id, userId, dto);
  }

  @Delete(":id")
  async removeShare(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: RemoveShareDto) {
    return this.shareDocumentService.removeShare(id, userId, dto);
  }
}
