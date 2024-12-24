import { z } from "zod";

const commonDocumentSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  isArchived: z.boolean(),
  isStarred: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  parentId: z.string().nullable(),
  isLeaf: z.boolean(),
  position: z.number(),
});

export type CommonDocumentResponse = z.infer<typeof commonDocumentSchema>;

const noticeType = ["NEW", "UPDATE", "NONE"] as const;
const permission = ["EDIT", "READ"] as const;

export type Permission = (typeof permission)[number];
export type NoticeType = (typeof noticeType)[number];

const commonSharedDocumentSchema = commonDocumentSchema
  .omit({
    isLeaf: true,
  })
  .extend({
    owner: z.object({
      displayName: z.string().nullable(),
      email: z.string(),
    }),
    permission: z.enum(permission).optional(),
    noticeType: z.enum(noticeType).optional(),
  });

export type CommonSharedDocumentResponse = z.infer<typeof commonSharedDocumentSchema>;

//  ============== request ==============
export const createDocumentSchema = z.object({
  title: z.string(),
  content: z.string(),
  parentId: z.string().nullable(),
});

export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isStarred: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
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

export const detailDocumentSchema = commonDocumentSchema
  .omit({
    isLeaf: true,
  })
  .extend({
    content: z.string(),
    // TODO: more detail data
  });

export type DetailDocumentResponse = z.infer<typeof detailDocumentSchema>;

export const detailSharedDocumentSchema = commonSharedDocumentSchema.extend({
  content: z.string(),
  // TODO: more detail data
});

export type DetailSharedDocumentResponse = z.infer<typeof detailSharedDocumentSchema>;
