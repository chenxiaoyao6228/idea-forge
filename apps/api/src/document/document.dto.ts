import { createZodDto } from "nestjs-zod";
import {
  createDocumentSchema,
  searchDocumentSchema,
  updateDocumentSchema,
  moveDocumentsSchema,
  listDocumentSchema,
  shareDocumentSchema,
  requestDocumentPermissionSchema,
  PublishDocumentRequestSchema,
} from "@idea/contracts";

export class DocumentPagerDto extends createZodDto(listDocumentSchema) {}

export class SearchDocumentDto extends createZodDto(searchDocumentSchema) {}

export class CreateDocumentDto extends createZodDto(createDocumentSchema) {}

export class UpdateDocumentDto extends createZodDto(updateDocumentSchema) {}

export class MoveDocumentsDto extends createZodDto(moveDocumentsSchema) {}

export class ShareDocumentDto extends createZodDto(shareDocumentSchema) {}

export class RequestDocumentPermissionDto extends createZodDto(requestDocumentPermissionSchema) {}

export class PublishDocumentDto extends createZodDto(PublishDocumentRequestSchema) {}
