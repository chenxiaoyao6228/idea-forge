import { z } from "zod";
import { basePagerSchema } from "./_base";

export const permission = ["MANAGE", "SHARE", "EDIT", "COMMENT", "READ", "NONE"] as const;

export const userPermissionSchema = z.object({
  id: z.string(),
  userId: z.number(),
  documentId: z.string().optional(),
  subspaceId: z.string().optional(),
  permission: z.enum(permission),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const updateUserPermissionIndexSchema = z.object({
  index: z.string(),
});

export const userPermissionListRequestSchema = basePagerSchema.extend({
  query: z.string().optional(),
  userId: z.string().optional(),
  documentId: z.string().optional(),
});

export const userPermissionResponseSchema = z.object({
  id: z.string(),
  userId: z.number(),
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
  subspaceId: z.string().optional(),
  collection: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  permission: z.enum(permission),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Document schema for the response
export const documentResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  parentId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Add other document fields as needed
});

export const userPermissionListResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
  data: z.object({
    userPermissions: z.array(userPermissionResponseSchema),
    documents: z.array(documentResponseSchema),
  }),
  policies: z.record(z.any()), // Placeholder for now
});

// Types
export type UserPermission = z.infer<typeof userPermissionSchema>;
export type UserPermissionListRequest = z.infer<typeof userPermissionListRequestSchema>;
export type UserPermissionResponse = z.infer<typeof userPermissionResponseSchema>;
export type DocumentResponse = z.infer<typeof documentResponseSchema>;
export type UserPermissionListResponse = z.infer<typeof userPermissionListResponseSchema>;
