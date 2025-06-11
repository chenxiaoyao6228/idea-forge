import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from "@nestjs/common";
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
import { Action } from "@/_shared/casl/ability.class";
import { PermissionService } from "@/permission/permission.service";
import { CheckPolicy } from "@/_shared/casl/policy.decorator";
import { PolicyGuard } from "@/_shared/casl/policy.guard";
import { ResourceType } from "@prisma/client";
import { PermissionInheritanceService } from "@/permission/permission-inheritance.service";

@UseGuards(PolicyGuard)
@Controller("/api/documents")
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly searchDocumentService: SearchDocumentService,
    private readonly moveDocumentService: MoveDocumentService,
    private readonly permissionInheritanceService: PermissionInheritanceService,
    private readonly groupService: GroupService,
  ) {}

  @Post("")
  create(@GetUser("id") userId: string, @Body() dto: CreateDocumentDto) {
    return this.documentService.create(userId, dto);
  }

  @Post("list")
  async list(@GetUser("id") userId: string, @Body() dto: DocumentPagerDto) {
    return this.documentService.list(userId, dto);
  }

  @Post("move")
  @CheckPolicy(Action.Move, "Doc")
  async moveDocuments(@GetUser("id") userId: string, @Body() dto: MoveDocumentsDto) {
    const result = await this.moveDocumentService.moveDocs(userId, dto);

    if (dto.parentId) {
      await this.permissionInheritanceService.updatePermissionsOnMove(dto.id, dto.parentId, dto.subspaceId ?? null);
    }

    return result;
  }

  // ==============keep router without id above ==========================================

  @Get(":id")
  findOne(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.findOne(id, userId);
  }

  @Patch(":id")
  update(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentService.update(id, userId, dto);
  }

  @Delete(":id")
  @CheckPolicy(Action.Delete, "Doc")
  remove(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.remove(id, userId);
  }

  // ============== doc share ==========================================

  @Post(":id/share")
  async shareDocument(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: ShareDocumentDto) {
    return this.documentService.shareDocument(userId, id, dto);
  }

  @Get(":id/shares")
  async listDocShares(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.listDocShares(id);
  }

  @Post(":id/search-users")
  async searchUsersForSharing(@GetUser("id") userId: string, @Param("id") id: string, @Body("query") query?: string) {
    return this.documentService.searchUsersForSharing(userId, id, query);
  }

  // ============== doc permission ==========================================

  @Post(":id/user-permissions")
  @CheckPolicy(Action.ManagePermissions, "Doc")
  async addUserPermission(@Param("id") docId: string, @Body() dto: DocUserPermissionDto, @GetUser("id") userId: string) {
    const permission = await this.documentService.addUserPermission(docId, dto.userId, dto.permission, userId);

    // Propagate permission to children
    await this.permissionInheritanceService.propagatePermissions(ResourceType.DOCUMENT, docId, permission);

    return permission;
  }

  @Patch(":id/user-permissions/:permissionId")
  @CheckPolicy(Action.ViewPermissions, "Doc")
  async updateUserPermission(@Param("permissionId") permissionId: string, @Body() dto: DocUserPermissionDto) {
    const updatedPermission = await this.documentService.updateUserPermission(permissionId, dto.permission, dto.userId);
    await this.permissionInheritanceService.updateInheritedPermissions(permissionId, dto.permission, "user");
    return updatedPermission;
  }

  @Delete(":id/user-permissions/:targetUserId")
  async removeUserPermission(@GetUser("id") userId: string, @Param("id") id: string, @Param("targetUserId") targetUserId: string) {
    return this.documentService.removeUserPermission(userId, id, targetUserId);
  }

  @Get(":id/user-permissions")
  async listUserPermissions(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.listUserPermissions(id);
  }

  // ============== group permission ==========================================

  @Post(":id/group-permissions")
  async addGroupPermission(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: DocGroupPermissionDto) {
    return this.documentService.addGroupPermission(id, dto.groupId, dto.permission, userId, userId);
  }

  @Delete(":id/group-permissions/:groupId")
  async removeGroupPermission(@GetUser("id") userId: string, @Param("id") id: string, @Param("groupId") groupId: string) {
    return this.documentService.removeGroupPermission(userId, id, groupId);
  }

  // TODO: pagination, combined with client side PaginationList
  @Get(":id/group-permissions")
  async listGroupPermissions(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.listGroupPermissions(id);
  }

  @Post(":id/search-groups")
  async searchGroupsForSharing(@GetUser("id") userId: string, @Param("id") id: string, @Body("query") query?: string) {
    return this.groupService.searchGroupsForSharing(userId, id, query);
  }
}
