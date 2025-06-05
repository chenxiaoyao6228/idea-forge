import { z } from "zod";
import { basePagerSchema } from "./_base";

export const permission = ["MANAGE", "SHARE", "EDIT", "COMMENT", "READ", "NONE"] as const;

export const docShareUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  displayName: z.string().nullable(),
  permission: z.enum(permission),
});

export const docShareInfoSchema = z.object({
  id: z.string().optional(),
  documentId: z.string().optional(),
});

export const createShareSchema = z.object({
  documentId: z.string(),
  published: z.boolean().optional(),
  urlId: z.string().optional(),
  includeChildDocuments: z.boolean().optional(),
});

export const updateShareSchema = z.object({
  id: z.string(),
  includeChildDocuments: z.boolean().optional(),
  published: z.boolean().optional(),
  urlId: z.string().optional(),
  allowIndexing: z.boolean().optional(),
});

export const revokeShareSchema = z.object({
  id: z.string(),
});

export const shareListRequestSchema = basePagerSchema.extend({
  query: z.string().optional(),
});

export const shareResponseSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  document: z.object({
    id: z.string(),
    title: z.string(),
    workspace: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      avatar: z.string().nullable(),
    }),
    subspace: z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      avatar: z.string().nullable(),
    }).nullable(),
  }),
  author: z.object({
    id: z.number(),
    email: z.string(),
    displayName: z.string().nullable(),
  }),
  sharedTo: z.object({
    id: z.number(),
    email: z.string(),
    displayName: z.string().nullable(),
  }),
  permission: z.enum(permission),
  includeChildDocuments: z.boolean(),
  published: z.boolean(),
  urlId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const shareInfoResponseSchema = z.object({
  data: z.object({
    shares: z.array(shareResponseSchema),
  }),
});

export const shareListResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
  data: z.array(shareResponseSchema),
});

export const shareCreateResponseSchema = z.object({
  data: shareResponseSchema,
});

export const shareUpdateResponseSchema = z.object({
  data: shareResponseSchema,
});

export const shareRevokeResponseSchema = z.object({
  success: z.boolean(),
});

// Types
export type DocShareUser = z.infer<typeof docShareUserSchema>;
export type DocShareInfoDto = z.infer<typeof docShareInfoSchema>;
export type CreateShareDto = z.infer<typeof createShareSchema>;
export type UpdateShareDto = z.infer<typeof updateShareSchema>;
export type RevokeShareDto = z.infer<typeof revokeShareSchema>;
export type ShareListRequest = z.infer<typeof shareListRequestSchema>;
export type ShareResponse = z.infer<typeof shareResponseSchema>;
export type ShareInfoResponse = z.infer<typeof shareInfoResponseSchema>;
export type ShareListResponse = z.infer<typeof shareListResponseSchema>;
export type ShareCreateResponse = z.infer<typeof shareCreateResponseSchema>;
export type ShareUpdateResponse = z.infer<typeof shareUpdateResponseSchema>;
export type ShareRevokeResponse = z.infer<typeof shareRevokeResponseSchema>;