import { z } from "zod";
import {  DocOptionalDefaultsSchema,  DocTypeSchema, DocVisibilitySchema, PermissionSchema } from "./schema";
import { BasePageResult, basePagerSchema } from "./_base";
import { Permission } from "@prisma/client";

// FIXME: the contentBinary cause Buffer error in client
 const DocSchema = z.object({
  type: DocTypeSchema,
  visibility: DocVisibilitySchema,
  id: z.string().cuid(),
  title: z.string(),
  content: z.string(),
  // contentBinary: z.instanceof(Buffer).nullable(),
  archivedAt: z.coerce.date().nullable(),
  publishedAt: z.coerce.date().nullable(),
  deletedAt: z.coerce.date().nullable(),
  parentId: z.string().nullable(),
  position: z.number().int(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  icon: z.string().nullable(),
  coverImageId: z.string().nullable(),
  authorId: z.number().int(),
  workspaceId: z.string(),
  subspaceId: z.string().nullable(),
  createdById: z.number().int(),
  createdBy: z.object({
    id: z.number().int(),
    email: z.string(),
    displayName: z.string(),
  }),
})

const commonDocumentSchema = DocSchema.pick({
  id: true,
  title: true,
  archivedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  parentId: true,
  icon: true,
  position: true,
  createdById: true,
  createdBy: true,
})
export type CommonDocument = z.infer<typeof commonDocumentSchema>;

const commonDocumentResponseSchema = commonDocumentSchema.merge(z.object({
  isLeaf: z.boolean(),
}))

export type CommonDocumentResponse = z.infer<typeof commonDocumentResponseSchema>;


const commonSharedDocumentSchema = commonDocumentSchema
  .extend({
    owner: z.object({
      displayName: z.string().nullable(),
      email: z.string(),
    }),
    permission:PermissionSchema.optional(),
    coverImage: z
      .object({
        scrollY: z.number(),
        url: z.string(),
      })
      .nullable(),
  });

export type CommonSharedDocumentResponse = z.infer<typeof commonSharedDocumentSchema>;

// create doc
export const createDocumentSchema = DocSchema.pick({
  title: true,
  content: true,
  parentId: true,
  workspaceId: true,
  subspaceId: true,
  type: true,
  visibility: true,
});
export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;

export interface CreateDocumentResponse extends CommonDocumentResponse {}

// list doc
export const listDocumentSchema = basePagerSchema.merge(DocOptionalDefaultsSchema.pick({
  parentId: true, 
  workspaceId: true,
  subspaceId: true,
  visibility: true,
  archivedAt: true,
  // isStarred: true,
  type: true,
 })); 
export type ListDocumentDto = z.infer<typeof listDocumentSchema>;


export type ListDocumentResponse = BasePageResult<CommonDocumentResponse>

// update doc
export const updateDocumentSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  icon: z.string().optional(),
  isStarred: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
});

export type UpdateDocumentDto = z.infer<typeof updateDocumentSchema>;


// search doc
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

export interface TitleMatch {
  id: string;
  title: string;
}

export interface ContentMatch {
  id: number;
  title: string;
  matches: Array<{
    nodeId: string;
    text: string;
    beforeText?: string;
    afterText?: string;
    type: string;
  }>;
}

export interface SearchDocumentResponse {
  titleMatches: TitleMatch[];
  contentMatches: ContentMatch[];
}

// move doc
export const moveDocumentsSchema = z.object({
  id: z.string().cuid(),
  parentId: z.string().cuid().optional().nullish(),
  subspaceId: z.string().cuid().optional().nullish(), // exist when moving to another subspace  
  index: z.number().gte(0).optional()
});

export type MoveDocumentsDto = z.infer<typeof moveDocumentsSchema>;


// share doc
export const docShareUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  displayName: z.string().nullable(),
  permission:PermissionSchema,
});

export type DocShareUser = z.infer<typeof docShareUserSchema>;

export const shareDocumentSchema = z.object({
  email: z.string().email(),
  permission:PermissionSchema,
  docId: z.string().cuid(),
  published: z.boolean().optional(),
  urlId: z.string().optional(),
  includeChildDocuments: z.boolean().optional(),
});

export type ShareDocumentDto = z.infer<typeof shareDocumentSchema>;

// update doc
export const updateSharePermissionSchema = z.object({
  userId: z.string(),
  permission:PermissionSchema,
});

export type UpdateSharePermissionDto = z.infer<typeof updateSharePermissionSchema>;

export const removeShareSchema = z.object({
  targetUserId: z.string(),
});

export type RemoveShareDto = z.infer<typeof removeShareSchema>;

export const updateCoverSchema = z.object({
  url: z.string().optional(),
  scrollY: z.number().optional(),
  isPreset: z.boolean().optional(),
});

export type UpdateCoverDto = z.infer<typeof updateCoverSchema>;

// Permission schemas
export const docUserPermissionSchema = z.object({
  userId: z.string(),
  permission:PermissionSchema,
});

export const docGroupPermissionSchema = z.object({
  groupId: z.string(),
  permission:PermissionSchema,
  docId: z.string(),
});

export type DocUserPermissionDto = z.infer<typeof docUserPermissionSchema>;
export type DocGroupPermissionDto = z.infer<typeof docGroupPermissionSchema>;

//  ============== response ==============

export interface UpdateDocumentResponse extends CommonDocumentResponse {}

export const detailDocumentSchema = commonDocumentSchema
  .extend({
    content: z.string(),
    coverImage: z
      .object({
        scrollY: z.number(),
        url: z.string(),
      })
      .nullable(),
    permission:PermissionSchema,
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

export interface DocUserPermissionResponse {
  id: string;
  userId: string;
  documentId: string;
  permission: Permission;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    email: string;
    displayName: string;
  };
}

export interface DocGroupPermissionResponse {
  id: string;
  groupId: string;
  documentId: string;
  permission: Permission;
  createdAt: Date;
  updatedAt: Date;
  group: {
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
  };
}

export interface SearchUserResponse {
  data: Array<{
    id: number;
    email: string;
    displayName: string;
    avatar?: string;
  }>;
}

export interface SearchGroupResponse {
  data: Array<{
    id: string;
    name: string;
    description: string | null;
    memberCount: number;
  }>;
}
