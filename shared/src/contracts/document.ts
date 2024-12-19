import { z } from "zod";

const commonDocumentSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  content: z.string(),
  isArchived: z.boolean(),
  isStarred: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  parentId: z.string().nullable(),
  sharedPassword: z.string().nullable(),
  isLeaf: z.boolean(),
  position: z.number(),
});

export type CommonDocumentResponse = z.infer<typeof commonDocumentSchema>;

//  ============== request ==============
export const createDocumentSchema = z.object({
  title: z.string(),
  content: z.string(),
  parentId: z.string().nullable(),
  sharedPassword: z.string().nullable().optional(),
});

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isStarred: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
  sharedPassword: z.string().nullable().optional(),
});

export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;

export const searchDocumentSchema = z.object({
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

export type SearchDocumentDto = z.infer<typeof searchDocumentSchema>;

export const moveDocumentsSchema = z.object({
  id: z.string().cuid(),
  targetId: z.string(),
  dropPosition: z.number(), // -1 表示移动到目标文档之前，0 表示移动到目标文档之后，1 表示移动到目标文档之后
});

export type MoveDocumentsDto = z.infer<typeof moveDocumentsSchema>;

//  ============== response ==============
export interface CreateDocumentResponse extends CommonDocumentResponse {}
export interface UpdateDocumentResponse extends CommonDocumentResponse {}
