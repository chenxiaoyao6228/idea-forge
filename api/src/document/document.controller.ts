import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common";
import {
  CreateDocumentDto,
  SearchDocumentDto,
  UpdateDocumentDto,
  MoveDocumentsDto,
  DocumentPagerDto,
  ShareDocumentDto,
  DocUserPermissionDto,
  DocGroupPermissionDto,
} from "./document.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { UpdateCoverDto, User } from "contracts";
import { SearchDocumentService } from "./search-document.service";
import { DocumentService } from "./document.service";
import { MoveDocumentService } from "./move-document.service";

@Controller("/api/documents")
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly searchDocumentService: SearchDocumentService,
    private readonly moveDocumentService: MoveDocumentService,
  ) {}

  @Post("")
  create(@GetUser("id") userId: number, @Body() dto: CreateDocumentDto) {
    return this.documentService.create(userId, dto);
  }

  @Post("list")
  async list(@GetUser("id") userId: number, @Body() dto: DocumentPagerDto) {
    return this.documentService.list(userId, dto);
  }

  @Post("move")
  async moveDocuments(@GetUser("id") userId: number, @Body() dto: MoveDocumentsDto) {
    return this.moveDocumentService.moveDocs(userId, dto);
  }

  // ==============keep router without id above ==========================================

  @Get(":id")
  findOne(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.findOne(id, userId);
  }

  @Patch(":id")
  update(@GetUser("id") userId: number, @Param("id") id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentService.update(id, userId, dto);
  }

  @Delete(":id")
  remove(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.remove(id, userId);
  }

  // ============== doc share ==========================================

  @Post(":id/share")
  async shareDocument(@GetUser("id") userId: number, @Param("id") id: string, @Body() dto: ShareDocumentDto) {
    return this.documentService.shareDocument(userId, id, dto);
  }

  @Get(":id/shares")
  async listDocShares(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.listDocShares(id);
  }

  // ============== doc permission ==========================================

  @Post(":id/user-permissions")
  async addUserPermission(@GetUser("id") userId: number, @Param("id") id: string, @Body() dto: DocUserPermissionDto) {
    return this.documentService.addUserPermission(userId, id, dto.userId, dto.permission);
  }

  @Delete(":id/user-permissions/:targetUserId")
  async removeUserPermission(@GetUser("id") userId: number, @Param("id") id: string, @Param("targetUserId") targetUserId: number) {
    return this.documentService.removeUserPermission(userId, id, targetUserId);
  }

  @Get(":id/user-permissions")
  async listUserPermissions(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.listUserPermissions(id);
  }

  @Post(":id/group-permissions")
  async addGroupPermission(@GetUser("id") userId: number, @Param("id") id: string, @Body() dto: DocGroupPermissionDto) {
    return this.documentService.addGroupPermission(userId, id, dto.groupId, dto.permission);
  }

  @Delete(":id/group-permissions/:groupId")
  async removeGroupPermission(@GetUser("id") userId: number, @Param("id") id: string, @Param("groupId") groupId: string) {
    return this.documentService.removeGroupPermission(userId, id, groupId);
  }

  @Get(":id/group-permissions")
  async listGroupPermissions(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.listGroupPermissions(id);
  }
}
