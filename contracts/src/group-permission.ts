import { z } from "zod";
import { basePagerSchema } from "./_base";

export const permission = ["MANAGE", "SHARE", "EDIT", "COMMENT", "READ", "NONE"] as const;

export const groupPermissionSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  docId: z.string(),
  permission: z.enum(permission),
  createdAt: z.string(),
  updatedAt: z.string(),
  userId: z.string(),
  createdById: z.number(),
});

export const updateGroupPermissionIndexSchema = z.object({
  index: z.string(),
});

export const groupPermissionListRequestSchema = basePagerSchema.extend({
  query: z.string().optional(),
  groupId: z.string().optional(),
  documentId: z.string().optional(),
});

export const groupPermissionResponseSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  group: z.object({
    id: z.string(),
    name: z.string(),
    memberCount: z.number(),
  }),
  documentId: z.string().optional(),
  document: z.object({
    id: z.string(),
    title: z.string(),
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
});

export const groupPermissionListResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
  data: z.object({
    groupPermissions: z.array(groupPermissionResponseSchema),
    documents: z.array(documentResponseSchema),
  }),
  policies: z.record(z.any()), // Placeholder for now
});

// Types
export type GroupPermission = z.infer<typeof groupPermissionSchema>;
export type GroupPermissionListRequest = z.infer<typeof groupPermissionListRequestSchema>;
export type GroupPermissionResponse = z.infer<typeof groupPermissionResponseSchema>;
export type DocumentResponse = z.infer<typeof documentResponseSchema>;
export type GroupPermissionListResponse = z.infer<typeof groupPermissionListResponseSchema>;
export type UpdateGroupPermissionIndex = z.infer<typeof updateGroupPermissionIndexSchema>;
