import { z } from "zod";
import { BasePageResult, basePagerSchema } from "./_base";
import { PermissionLevelSchema, DocSchema } from "./prisma-type-generated";

const commonDocumentSchema = DocSchema.pick({
  id: true,
  title: true,
  archivedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  parentId: true,
  icon: true,
  createdById: true,
  subspaceAdminPermission: true,
  subspaceMemberPermission: true,
  nonSubspaceMemberPermission: true,
});
export type CommonDocument = z.infer<typeof commonDocumentSchema>;

const commonDocumentResponseSchema = commonDocumentSchema.merge(
  z.object({
    isLeaf: z.boolean(),
  }),
);

export type CommonDocumentResponse = z.infer<typeof commonDocumentResponseSchema>;

const commonSharedDocumentSchema = commonDocumentSchema.extend({
  owner: z.object({
    displayName: z.string().nullable(),
    email: z.string(),
  }),
  permission: z
    .object({
      level: z.enum(["READ", "WRITE"]),
    })
    .optional(),
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
  contentBinary: true,
}).partial({
  parentId: true, // parentId is optional - not all documents have a parent
  contentBinary: true, // contentBinary is optional - can be set later
});
export type CreateDocumentDto = z.infer<typeof createDocumentSchema>;

export interface CreateDocumentResponse extends CommonDocumentResponse {}

// list doc
export const listDocumentSchema = basePagerSchema.extend({
  parentId: z.string().cuid(),
  archivedAt: z.boolean().optional(),
  subspaceId: z.string().cuid().optional(),
  // for document sharing
  sharedDocumentId: z.string().cuid().optional(),
  includeSharedChildren: z.boolean().optional(),
});
export type ListDocumentDto = z.infer<typeof listDocumentSchema>;

export type ListDocumentResponse = BasePageResult<CommonDocumentResponse>;

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
  sort: z.string().default("createdAt").optional(),
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
  subspaceId: z.string().cuid().optional().nullish(),
  index: z.number().optional(),
});

export type MoveDocumentsDto = z.infer<typeof moveDocumentsSchema>;

// share doc with permission
export const shareDocumentSchema = z.object({
  workspaceId: z.string(),
  targetUserIds: z.array(z.string()).optional(),
  targetGroupIds: z.array(z.string()).optional(),
  permission: z.enum(["NONE", "READ", "COMMENT", "EDIT", "MANAGE"]),
  includeChildDocuments: z.boolean().optional(),
});

export type ShareDocumentDto = z.infer<typeof shareDocumentSchema>;

// request permission for document
export const requestDocumentPermissionSchema = z.object({
  requestedPermission: z.enum(["READ", "COMMENT", "EDIT", "MANAGE"]),
  reason: z.string().min(1).max(500),
});

export type RequestDocumentPermissionDto = z.infer<typeof requestDocumentPermissionSchema>;

export const requestDocumentPermissionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  notificationsSent: z.number(),
});

export type RequestDocumentPermissionResponse = z.infer<typeof requestDocumentPermissionResponseSchema>;

// Permission source metadata schema (reused from permission.ts)
const permissionSourceMetadataSchema = z.object({
  level: z.string(),
  source: z.string(),
  sourceDocId: z.string().optional(),
  sourceDocTitle: z.string().optional(),
  priority: z.number().optional(),
});

const parentPermissionSourceMetadataSchema = z.object({
  level: z.string().optional(),
  source: z.string(),
  sourceDocId: z.string().optional(),
  sourceDocTitle: z.string().optional(),
  priority: z.number().optional(),
});

// public share doc
export const docShareUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  displayName: z.string().nullable(),
  permission: z.object({
    level: z.string(),
  }),
  permissionSource: permissionSourceMetadataSchema.optional(), // Permission source metadata
  hasParentPermission: z.boolean().optional(), // Indicates user has permission from parent
  parentPermissionSource: parentPermissionSourceMetadataSchema.optional(), // Parent permission details
  grantedBy: z
    .object({
      displayName: z.string().nullable(),
      email: z.string(),
    })
    .optional(), // Who granted this permission
  type: z.literal("user"),
});

export type DocShareUser = z.infer<typeof docShareUserSchema>;

// group share doc
export const docShareGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  memberCount: z.number(),
  permission: z.object({
    level: z.string(),
  }),
  permissionSource: permissionSourceMetadataSchema.optional(), // Permission source metadata
  hasParentPermission: z.boolean().optional(), // Indicates group has permission from parent
  parentPermissionSource: parentPermissionSourceMetadataSchema.optional(), // Parent permission details
  grantedBy: z
    .object({
      displayName: z.string().nullable(),
      email: z.string(),
    })
    .optional(), // Who granted this permission
  sourceGroups: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
      }),
    )
    .optional(), // Groups that granted this permission (for users in multiple groups)
  type: z.literal("group"),
});

export type DocShareGroup = z.infer<typeof docShareGroupSchema>;

// union type for both user and group shares
export const docShareSchema = z.union([docShareUserSchema, docShareGroupSchema]);
export type DocShareItem = z.infer<typeof docShareSchema>;

// update doc - supports both user and group permission updates
export const updateSharePermissionSchema = z
  .object({
    userId: z.string().optional(),
    groupId: z.string().optional(),
    permission: PermissionLevelSchema,
  })
  .refine((data) => data.userId || data.groupId, {
    message: "Either userId or groupId must be provided",
  });

export type UpdateSharePermissionDto = z.infer<typeof updateSharePermissionSchema>;

export const removeShareSchema = z.object({
  targetUserId: z.string(),
});

export type RemoveShareDto = z.infer<typeof removeShareSchema>;

export const removeGroupShareSchema = z.object({
  targetGroupId: z.string(),
});

export type RemoveGroupShareDto = z.infer<typeof removeGroupShareSchema>;

// update document subspace permissions
export const updateDocumentSubspacePermissionsSchema = z.object({
  subspaceAdminPermission: PermissionLevelSchema.nullable().optional(), // Allow null to reset to inherited
  subspaceMemberPermission: PermissionLevelSchema.nullable().optional(), // Allow null to reset to inherited
  nonSubspaceMemberPermission: PermissionLevelSchema.nullable().optional(), // Allow null to reset to inherited
});

export type UpdateDocumentSubspacePermissionsDto = z.infer<typeof updateDocumentSubspacePermissionsSchema>;

// ============== others ================

export const updateCoverSchema = z.object({
  url: z.string().optional(),
  scrollY: z.number().optional(),
  isPreset: z.boolean().optional(),
});

export type UpdateCoverDto = z.infer<typeof updateCoverSchema>;

//  ============== response ==============

export interface UpdateDocumentResponse extends CommonDocumentResponse {}

export const detailDocumentSchema = commonDocumentSchema.extend({
  content: z.string(),
  coverImage: z
    .object({
      scrollY: z.number(),
      url: z.string(),
    })
    .nullable(),
  permission: z.object({
    level: z.enum(["READ", "WRITE"]),
  }),
});

export type DetailDocumentResponse = z.infer<typeof detailDocumentSchema>;

export const detailSharedDocumentSchema = commonSharedDocumentSchema.extend({
  content: z.string(),
});

export type DetailSharedDocumentResponse = z.infer<typeof detailSharedDocumentSchema>;

export const docSharesSchema = z.array(docShareSchema);
export type DocSharesResponse = z.infer<typeof docSharesSchema>;

export interface TrashDocumentResponse {
  id: string;
  title: string;
  updatedAt: Date;
  deletedAt: Date | null;
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
  permission: z.infer<typeof PermissionLevelSchema>;
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
  permission: z.infer<typeof PermissionLevelSchema>;
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
