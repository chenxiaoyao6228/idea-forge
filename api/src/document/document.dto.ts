import { createZodDto } from "nestjs-zod";
import { createDocumentSchema, searchDocumentSchema, updateDocumentSchema, moveDocumentsSchema } from "shared";

export class SearchDocumentDto extends createZodDto(searchDocumentSchema) {}

export class CreateDocumentDto extends createZodDto(createDocumentSchema) {}

export class UpdateDocumentDto extends createZodDto(updateDocumentSchema) {}

export class MoveDocumentsDto extends createZodDto(moveDocumentsSchema) {}
