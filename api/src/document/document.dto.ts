import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const createDocumentSchema = z.object({
  title: z.string(),
  content: z.string(),
  parentId: z.string().optional(),
  sharedPassword: z.string().optional(),
});

const updateDocumentSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isStarred: z.boolean().optional(),
  parentId: z.string().optional(),
  sharedPassword: z.string().optional(),
});

const searchDocumentSchema = z.object({
  keyword: z.string().optional(),
  sort: z.string().default("createdAt"),
  order: z.enum(["asc", "desc"]).default("asc"),
  page: z
    .string()
    .default("1")
    .transform((val) => {
      const num = Number.parseInt(val);
      if (Number.isNaN(num) || num < 1) return 1;
      return num;
    }),
  limit: z
    .string()
    .default("10")
    .transform((val) => {
      const num = Number.parseInt(val);
      if (Number.isNaN(num) || num < 1) return 10;
      return num;
    }),
});

export class SearchDocumentDto extends createZodDto(searchDocumentSchema) {}

export class CreateDocumentDto extends createZodDto(createDocumentSchema) {}

export class UpdateDocumentDto extends createZodDto(updateDocumentSchema) {}
