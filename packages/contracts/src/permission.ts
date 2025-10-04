import { z } from "zod";
import { basePagerSchema } from "./_base";
import { PermissionLevelSchema, DocumentPermissionSchema } from "./prisma-type-generated";
import type { PermissionLevel } from "./prisma-type-generated";

// Permission resolution result with source metadata
export interface PermissionResolutionResult {
  level: PermissionLevel;
  source: "direct" | "group" | "inherited" | "subspace" | "workspace" | "guest" | "none";
  sourceDocId?: string; // If source='inherited', which ancestor granted access
  sourceDocTitle?: string; // Title of the ancestor document
  priority: number; // Priority value (1=highest)
  inheritanceChain?: string[]; // Array of doc IDs from current doc to source doc
}

// Request schemas
export const addUserPermissionSchema = z.object({
  userId: z.string(),
  docId: z.string(),
  permission: PermissionLevelSchema,
});

export const addGroupPermissionSchema = z.object({
  groupId: z.string(),
  docId: z.string(),
  permission: PermissionLevelSchema,
});

export const updatePermissionSchema = z.object({
  permission: PermissionLevelSchema,
});

export const permissionListRequestSchema = basePagerSchema.extend({
  docId: z.string().optional(),
  userId: z.string().optional(),
  workspaceId: z.string(),
});

// Response schemas
export const permissionResponseSchema = DocumentPermissionSchema.extend({
  user: z
    .object({
      id: z.string(),
      email: z.string(),
      displayName: z.string().nullable(),
    })
    .nullable(),
  group: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  resource: z.object({
    id: z.string(),
    title: z.string().optional(),
    name: z.string().optional(),
  }),
});

export const sharedWithMeResponseSchema = z.object({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pageCount: z.number(),
  }),
  data: z.object({
    documents: z.array(z.any()),
  }),
});

export type AddUserPermissionRequest = z.infer<typeof addUserPermissionSchema>;
export type AddGroupPermissionRequest = z.infer<typeof addGroupPermissionSchema>;
export type UpdatePermissionRequest = z.infer<typeof updatePermissionSchema>;
export type PermissionListRequest = z.infer<typeof permissionListRequestSchema>;
export type PermissionResponse = z.infer<typeof permissionResponseSchema>;
export type SharedWithMeResponse = z.infer<typeof sharedWithMeResponseSchema>;
