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
import { GroupService } from "../group/group.service";

@Controller("/api/documents")
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly searchDocumentService: SearchDocumentService,
    private readonly moveDocumentService: MoveDocumentService,
    private readonly groupService: GroupService,
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
    return this.documentService.addUserPermission(id, dto.userId, dto.permission, userId);
  }

  @Delete(":id/user-permissions/:targetUserId")
  async removeUserPermission(@GetUser("id") userId: number, @Param("id") id: string, @Param("targetUserId") targetUserId: number) {
    return this.documentService.removeUserPermission(userId, id, targetUserId);
  }

  @Get(":id/user-permissions")
  async listUserPermissions(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.listUserPermissions(id);
  }

  @Post(":id/search-users")
  async searchUsersForSharing(@GetUser("id") userId: number, @Param("id") id: string, @Body("query") query?: string) {
    return this.documentService.searchUsersForSharing(userId, id, query);
  }

  // ============== group permission ==========================================

  @Post(":id/group-permissions")
  async addGroupPermission(@GetUser("id") userId: number, @Param("id") id: string, @Body() dto: DocGroupPermissionDto) {
    return this.documentService.addGroupPermission(id, dto.groupId, dto.permission, userId, userId);
  }

  @Delete(":id/group-permissions/:groupId")
  async removeGroupPermission(@GetUser("id") userId: number, @Param("id") id: string, @Param("groupId") groupId: string) {
    return this.documentService.removeGroupPermission(userId, id, groupId);
  }

  // TODO: pagination, combined with client side PaginationList
  @Get(":id/group-permissions")
  async listGroupPermissions(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.listGroupPermissions(id);
  }

  @Post(":id/search-groups")
  async searchGroupsForSharing(@GetUser("id") userId: number, @Param("id") id: string, @Body("query") query?: string) {
    return this.groupService.searchGroupsForSharing(userId, id, query);
  }
}
