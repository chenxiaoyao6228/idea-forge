import { z } from "zod";
import { basePagerSchema } from "./_base";

export const permission = ["MANAGE", "SHARE", "EDIT", "COMMENT", "READ", "NONE"] as const;

export const groupPermissionSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  documentId: z.string().optional(),
  collectionId: z.string().optional(),
  permission: z.enum(permission),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const groupPermissionListRequestSchema = basePagerSchema.extend({
  query: z.string().optional(),
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
  collectionId: z.string().optional(),
  collection: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
  permission: z.enum(permission),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const groupPermissionListResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
  data: z.array(groupPermissionResponseSchema),
});

// Types
export type GroupPermission = z.infer<typeof groupPermissionSchema>;
export type GroupPermissionListRequest = z.infer<typeof groupPermissionListRequestSchema>;
export type GroupPermissionResponse = z.infer<typeof groupPermissionResponseSchema>;
export type GroupPermissionListResponse = z.infer<typeof groupPermissionListResponseSchema>;
