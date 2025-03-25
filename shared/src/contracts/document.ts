import { z } from "zod";

const commonDocumentSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  isArchived: z.boolean(),
  isStarred: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  parentId: z.string().nullable(),
  icon: z.string().nullable(),
  isLeaf: z.boolean(),
  position: z.number(),
});

export type CommonDocumentResponse = z.infer<typeof commonDocumentSchema>;

const noticeType = ["NEW", "UPDATE", "NONE"] as const;
const permission = ["EDIT", "READ", "NONE"] as const;

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
    coverImage: z
      .object({
        scrollY: z.number(),
        url: z.string(),
      })
      .nullable(),
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
  icon: z.string().optional(),
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

export interface ContentMatch {
  id: number;
  title: string;
  matches: Array<{
    nodeId: string;
    text: string;
    position: number;
    beforeText?: string;
    afterText?: string;
    type: string;
  }>;
}

export interface SearchDocumentResponse {
  documents: CommonDocumentResponse[];
  contentMatches: ContentMatch[];
  total: number;
}

export const moveDocumentsSchema = z.object({
  id: z.string().cuid(),
  targetId: z.string(),
  // -1 represents moving before the target document, 0 represents moving after the target document, 1 represents moving after the target document
  dropPosition: z.number(),
});

export type MoveDocumentsDto = z.infer<typeof moveDocumentsSchema>;

export const docShareUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  displayName: z.string().nullable(),
  permission: z.enum(permission),
});

export type DocShareUser = z.infer<typeof docShareUserSchema>;

export const shareDocumentSchema = z.object({
  email: z.string().email(),
  permission: z.enum(permission),
  docId: z.string().cuid(),
});

export type ShareDocumentDto = z.infer<typeof shareDocumentSchema>;

export const updateSharePermissionSchema = z.object({
  userId: z.number(),
  permission: z.enum(permission),
});

export type UpdateSharePermissionDto = z.infer<typeof updateSharePermissionSchema>;

export const removeShareSchema = z.object({
  targetUserId: z.number(),
});

export type RemoveShareDto = z.infer<typeof removeShareSchema>;

export const updateCoverSchema = z.object({
  url: z.string().optional(),
  scrollY: z.number().optional(),
  isPreset: z.boolean().optional(),
});

export type UpdateCoverDto = z.infer<typeof updateCoverSchema>;

//  ============== response ==============
export interface CreateDocumentResponse extends CommonDocumentResponse {}
export interface UpdateDocumentResponse extends CommonDocumentResponse {}

export const detailDocumentSchema = commonDocumentSchema
  .omit({
    isLeaf: true,
  })
  .extend({
    content: z.string(),
    coverImage: z
      .object({
        scrollY: z.number(),
        url: z.string(),
      })
      .nullable(),
    permission: z.enum(permission),
  });

export type DetailDocumentResponse = z.infer<typeof detailDocumentSchema>;

export const detailSharedDocumentSchema = commonSharedDocumentSchema.extend({
  content: z.string(),
});

export type DetailSharedDocumentResponse = z.infer<typeof detailSharedDocumentSchema>;

export const docSharesSchema = z.array(docShareUserSchema);
export type DocSharesResponse = z.infer<typeof docSharesSchema>;

export interface TrashDocumentResponse {
  id: string;
  title: string;
  updatedAt: Date;
  parentId: string | null;
  icon: string | null;
  coverImage: {
    url: string;
    scrollY: number;
  } | null;
}

export interface DuplicateDocumentResponse extends CommonDocumentResponse {}
