import { z } from "zod";
import { basePagerSchema } from "./_base";

export const permission = ["MANAGE", "SHARE", "EDIT", "COMMENT", "READ", "NONE"] as const;

export const userPermissionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  documentId: z.string().optional(),
  collectionId: z.string().optional(),
  permission: z.enum(permission),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const userPermissionListRequestSchema = basePagerSchema.extend({
  query: z.string().optional(),
});

export const userPermissionResponseSchema = z.object({
  id: z.string(),
  userId: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string(),
    displayName: z.string().nullable(),
  }),
  documentId: z.string().optional(),
  document: z.object({
    id: z.string(),
    title: z.string(),
  }).optional(),
  collectionId: z.string().optional(),
  collection: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  permission: z.enum(permission),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const userPermissionListResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
  data: z.array(userPermissionResponseSchema),
});

// Types
export type UserPermission = z.infer<typeof userPermissionSchema>;
export type UserPermissionListRequest = z.infer<typeof userPermissionListRequestSchema>;
export type UserPermissionResponse = z.infer<typeof userPermissionResponseSchema>;
export type UserPermissionListResponse = z.infer<typeof userPermissionListResponseSchema>;
