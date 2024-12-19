import { createZodDto } from "nestjs-zod";
import { createDocumentSchema, searchDocumentSchema, updateDocumentSchema } from "shared";

export class SearchDocumentDto extends createZodDto(searchDocumentSchema) {}

export class CreateDocumentDto extends createZodDto(createDocumentSchema) {}

export class UpdateDocumentDto extends createZodDto(updateDocumentSchema) {}
