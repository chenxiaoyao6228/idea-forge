import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common";
import { CreateDocumentDto, SearchDocumentDto, UpdateDocumentDto, MoveDocumentsDto, DocumentPagerDto } from "./document.dto";
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
}
