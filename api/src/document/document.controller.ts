import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common";
import { CreateDocumentDto, SearchDocumentDto, UpdateDocumentDto, MoveDocumentsDto } from "./document.dto";
import { DocumentService } from "./ document.service";
import { GetUser } from "@/auth/decorators/get-user.decorator";

@Controller("/api/documents")
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get("tree")
  async getDirectoryTree(@GetUser("id") userId: number, @Query("parentId") parentId?: string) {
    return this.documentService.getDirectoryTree(userId, parentId);
  }

  @Get("search")
  async search(@GetUser("id") userId: number, @Query() dto: SearchDocumentDto) {
    return this.documentService.searchDocuments(userId, dto);
  }

  @Get("latest")
  findLatest(@GetUser("id") userId: number) {
    return this.documentService.findLatest(userId);
  }

  @Get(":id")
  findOne(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.findOne(id, userId);
  }

  @Post()
  create(@GetUser("id") userId: number, @Body() dto: CreateDocumentDto) {
    return this.documentService.create(userId, dto);
  }

  @Patch(":id")
  update(@GetUser("id") userId: number, @Param("id") id: string, @Body() dto: UpdateDocumentDto) {
    return this.documentService.update(id, userId, dto);
  }

  @Delete(":id")
  remove(@GetUser("id") userId: number, @Param("id") id: string) {
    return this.documentService.remove(id, userId);
  }

  @Post("move")
  async moveDocuments(@GetUser("id") userId: number, @Body() dto: MoveDocumentsDto) {
    return this.documentService.moveDocuments(userId, dto);
  }

  // FIXME: Generic matching must be placed last, need to find a way to handle this
  // @Get()
  // findAll(@GetUser("id") userId: number) {
  //   return this.documentService.findAll(userId);
  // }
}
