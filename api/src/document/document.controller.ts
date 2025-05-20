import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common";
import { CreateDocumentDto, SearchDocumentDto, UpdateDocumentDto, MoveDocumentsDto, DocumentPagerDto } from "./document.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { UpdateCoverDto, User } from "contracts";
import { SearchDocumentService } from "./search-document.service";
import { DocumentService } from "./document.service";

@Controller("/api/documents")
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly searchDocumentService: SearchDocumentService,
  ) {}

  @Post("create")
  create(@GetUser("id") userId: number, @Body() dto: CreateDocumentDto) {
    return this.documentService.create(userId, dto);
  }

  @Get("list")
  async list(@GetUser("id") userId: number, @Query() dto: DocumentPagerDto) {
    return this.documentService.list(userId, dto);
  }

  @Post("move")
  async moveDocuments(@GetUser("id") userId: number, @Body() dto: MoveDocumentsDto) {
    return this.documentService.moveDocs(userId, dto);
  }

  // TODO: remove this
  @Get("tree")
  async getNestedTree(@GetUser("id") userId: number, @Query("parentId") parentId?: string) {
    return this.documentService.getNestedTree(userId, parentId);
  }

  @Get("children")
  async loadChildren(@GetUser("id") userId: number, @Query("parentId") parentId?: string) {
    return this.documentService.loadChildren(userId, parentId);
  }

  @Get("search")
  async search(@GetUser("id") userId: number, @Query() dto: SearchDocumentDto) {
    return this.searchDocumentService.searchDocuments(userId, dto);
  }

  @Get("latest")
  findLatest(@GetUser("id") userId: number) {
    return this.documentService.findLatestOrCreate(userId);
  }

  // ================== trash =====================

  @Get("trash")
  getTrash(@GetUser("id") userId: number) {
    return this.documentService.getTrash(userId);
  }

  @Post("trash/empty")
  emptyTrash(@GetUser("id") userId: number) {
    return this.documentService.emptyTrash(userId);
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

  @Post(":id/restore")
  restore(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.restore(id, userId);
  }

  @Delete(":id/permanent")
  permanentDelete(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.permanentDelete(id, userId);
  }

  @Post(":id/duplicate")
  duplicate(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.duplicate(userId, id);
  }

  // ============== cover =======================
  @Patch(":id/cover")
  async uploadCover(@GetUser("id") userId: number, @Param("id") id: string, @Body() dto: UpdateCoverDto) {
    return this.documentService.updateCover(id, userId, dto);
  }

  @Delete(":id/cover")
  async deleteCover(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.removeCover(id, userId);
  }
}
