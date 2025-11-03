import { Controller, Get, Post, Body, Patch, Param, Delete } from "@nestjs/common";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { RemoveShareDto, RemoveGroupShareDto, ShareDocumentDto, UpdateSharePermissionDto } from "@idea/contracts";
import { ShareDocumentService } from "./share-document.services";

@Controller("/api/share-documents")
export class ShareDocumentController {
  constructor(private readonly shareDocumentService: ShareDocumentService) {}

  @Get("shared-docs")
  async getSharedDocuments(@GetUser("id") userId: string) {
    return this.shareDocumentService.getSharedWithMeDocuments(userId);
  }

  @Get(":id")
  getDocShares(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.shareDocumentService.getDocumentCollaborators(id, userId);
  }

  @Post()
  async shareDocument(@GetUser("id") userId: string, @Body() dto: ShareDocumentDto & { docId: string }) {
    return this.shareDocumentService.shareDocument(userId, dto.docId, dto);
  }

  @Patch(":id")
  async updateSharePermission(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: UpdateSharePermissionDto) {
    return this.shareDocumentService.updateSharePermission(id, userId, dto);
  }

  @Delete(":id")
  async removeShare(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: RemoveShareDto) {
    return this.shareDocumentService.removeShare(id, userId, dto);
  }

  @Delete(":id/group")
  async removeGroupShare(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: RemoveGroupShareDto) {
    return this.shareDocumentService.removeGroupShare(id, userId, dto);
  }
}
