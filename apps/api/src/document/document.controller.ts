import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from "@nestjs/common";
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  MoveDocumentsDto,
  ShareDocumentDto,
  SearchDocumentDto,
  RequestDocumentPermissionDto,
  PublishDocumentDto,
} from "./document.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { DocumentService } from "./document.service";
import { MoveDocumentService } from "./move-document.service";
import { Action } from "@/_shared/casl/ability.class";
import { CheckPolicy } from "@/_shared/casl/policy.decorator";
import { PolicyGuard } from "@/_shared/casl/policy.guard";
import { SearchDocumentService } from "./search-document.service";
import { DocumentTrashService } from "./trash-document.service";
import { ShareDocumentService } from "./share-document.services";
import { UpdateCoverDto, UpdateDocumentSubspacePermissionsDto } from "@idea/contracts";
import { PermissionListRequestDto } from "@/permission/permission.dto";

@UseGuards(PolicyGuard)
@Controller("/api/documents")
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly moveDocumentService: MoveDocumentService,
    private readonly searchDocumentService: SearchDocumentService,
    private readonly documentTrashService: DocumentTrashService,
    private readonly shareDocumentService: ShareDocumentService,
  ) {}

  @Post()
  create(@GetUser("id") userId: string, @Body() dto: CreateDocumentDto) {
    return this.documentService.create(userId, dto);
  }

  /**
   * POST /api/documents/create-welcome
   * Create a welcome document with pre-populated markdown content
   */
  @Post("create-welcome")
  async createWelcomeDocument(@GetUser("id") userId: string, @Body() body: { workspaceId: string; subspaceId: string }) {
    return this.documentService.createWelcomeDocument(userId, body.workspaceId, body.subspaceId);
  }

  @Get("shared-with-me")
  async getSharedWithMe(@GetUser("id") userId: string, @Query() query: PermissionListRequestDto) {
    return this.shareDocumentService.getSharedWithMeDocuments(userId, query);
  }

  /**
   * GET /api/documents/list
   * List documents with pagination and filtering
   */
  @Get("list")
  async list(
    @GetUser("id") userId: string,
    @Query("parentId") parentId: string,
    @Query("subspaceId") subspaceId?: string,
    @Query("archivedAt") archivedAt?: string,
    @Query("sharedDocumentId") sharedDocumentId?: string,
    @Query("includeSharedChildren") includeSharedChildren?: string,
    @Query("limit") limit?: string,
    @Query("page") page?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: string,
    @Query("cursor") cursor?: string,
    @Query("query") query?: string,
  ) {
    const dto: Record<string, any> = { parentId };

    if (subspaceId) dto.subspaceId = subspaceId;
    if (archivedAt !== undefined) dto.archivedAt = archivedAt === "true";
    if (sharedDocumentId) dto.sharedDocumentId = sharedDocumentId;
    if (includeSharedChildren !== undefined) dto.includeSharedChildren = includeSharedChildren === "true";
    if (limit) dto.limit = Number.parseInt(limit, 10);
    if (page) dto.page = Number.parseInt(page, 10);
    if (sortBy) dto.sortBy = sortBy;
    if (sortOrder) dto.sortOrder = sortOrder;
    if (cursor) dto.cursor = cursor;
    if (query) dto.query = query;

    return this.documentService.list(userId, dto as any);
  }

  @Post("move")
  // @CheckPolicy(Action.Move, "Doc")
  async moveDocuments(@GetUser("id") userId: string, @Body() dto: MoveDocumentsDto) {
    const result = await this.moveDocumentService.moveDocs(userId, dto);
    return result;
  }

  @Get("search")
  async search(@GetUser("id") userId: string, @Query() dto: SearchDocumentDto) {
    return this.searchDocumentService.searchDocuments(userId, dto);
  }

  @Get("trash")
  getTrash(@GetUser("id") userId: string) {
    return this.documentTrashService.getTrash(userId);
  }

  @Post("trash/empty")
  emptyTrash(@GetUser("id") userId: string) {
    return this.documentTrashService.emptyTrash(userId);
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
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.Delete, "Doc")
  remove(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentTrashService.deleteDocument(id, userId);
  }

  @Post(":id/duplicate")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.Duplicate, "Doc")
  duplicate(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.duplicate(userId, id);
  }

  // ============== internal doc share ==========================================

  @Post(":id/share")
  async shareDocument(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: ShareDocumentDto) {
    return this.shareDocumentService.shareDocument(userId, id, dto);
  }

  @Post(":id/request-permission")
  async requestPermission(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: RequestDocumentPermissionDto) {
    return this.shareDocumentService.requestDocumentPermission(userId, id, dto);
  }

  // ============== public doc share ==========================================
  // TODO:
  // @Post(":id/share-public")

  // ============== cover =======================
  @Patch(":id/cover")
  async uploadCover(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: UpdateCoverDto) {
    return this.documentService.updateCover(id, userId, dto);
  }

  @Delete(":id/cover")
  async deleteCover(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.removeCover(id, userId);
  }

  @Patch(":id/subspace-permissions")
  async updateSubspacePermissions(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: UpdateDocumentSubspacePermissionsDto) {
    return this.documentService.updateSubspacePermissions(id, userId, dto);
  }

  @Post(":id/publish")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.Publish, "Doc")
  async publishDocument(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.publishDocument(userId, id);
  }

  @Post(":id/restore")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.Restore, "Doc")
  async restoreDocument(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentTrashService.restore(id, userId);
  }

  @Post(":id/unpublish")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.Unpublish, "Doc")
  async unpublishDocument(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.unpublishDocument(userId, id);
  }

  @Delete(":id/permanent")
  @UseGuards(PolicyGuard)
  @CheckPolicy(Action.PermanentDelete, "Doc")
  async permanentDeleteDocument(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentTrashService.permanentDelete(id, userId);
  }
}
