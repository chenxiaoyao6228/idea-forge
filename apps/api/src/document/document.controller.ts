import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from "@nestjs/common";
import { CreateDocumentDto, UpdateDocumentDto, MoveDocumentsDto, ShareDocumentDto, SearchDocumentDto } from "./document.dto";
import { GetUser } from "@/auth/decorators/get-user.decorator";
import { DocumentService } from "./document.service";
import { MoveDocumentService } from "./move-document.service";
import { Action } from "@/_shared/casl/ability.class";
import { CheckPolicy } from "@/_shared/casl/policy.decorator";
import { PolicyGuard } from "@/_shared/casl/policy.guard";
import { SearchDocumentService } from "./search-document.service";
import { DocumentTrashService } from "./trash-document.service";
import { UpdateCoverDto } from "@idea/contracts";
import { PermissionListRequestDto } from "@/permission/permission.dto";

@UseGuards(PolicyGuard)
@Controller("/api/documents")
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly moveDocumentService: MoveDocumentService,
    private readonly searchDocumentService: SearchDocumentService,
    private readonly documentTrashService: DocumentTrashService,
  ) {}

  @Post()
  create(@GetUser("id") userId: string, @Body() dto: CreateDocumentDto) {
    return this.documentService.create(userId, dto);
  }

  @Get("shared-with-me")
  async getSharedWithMe(@GetUser("id") userId: string, @Query() query: PermissionListRequestDto) {
    return this.documentService.getSharedRootDocsWithMe(userId, query);
  }

  // FIXME: change to get method
  @Post("list")
  async list(@GetUser("id") userId: string, @Body() dto: any) {
    return this.documentService.list(userId, dto);
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
  @CheckPolicy(Action.Delete, "Doc")
  remove(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.remove(id, userId);
  }

  @Post(":id/duplicate")
  duplicate(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.duplicate(userId, id);
  }

  // ============== internal doc share ==========================================

  @Post(":id/share")
  async shareDocument(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: ShareDocumentDto) {
    return this.documentService.shareDocument(userId, id, dto);
  }

  // ============== public doc share ==========================================
  // TODO:
  // @Post(":id/share-public")

  //   // ============== cover =======================
  @Patch(":id/cover")
  async uploadCover(@GetUser("id") userId: string, @Param("id") id: string, @Body() dto: UpdateCoverDto) {
    return this.documentService.updateCover(id, userId, dto);
  }

  @Delete(":id/cover")
  async deleteCover(@GetUser("id") userId: string, @Param("id") id: string) {
    return this.documentService.removeCover(id, userId);
  }
}
