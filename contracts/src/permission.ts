import { z } from "zod";  
import { basePagerSchema } from "./_base";  
import { DocSchema } from "./schema/modelSchema/DocSchema";
  
// Enums from schema  
export const resourceTypeSchema = z.enum(["WORKSPACE", "SUBSPACE", "DOCUMENT"]);  
export const sourceTypeSchema = z.enum([  
  "DIRECT",   
  "GROUP",   
  "SUBSPACE_ADMIN",   
  "SUBSPACE_MEMBER",   
  "WORKSPACE_ADMIN",   
  "WORKSPACE_MEMBER",   
  "GUEST"  
]);  
export const permissionLevelSchema = z.enum([  
  "NONE",   
  "READ",   
  "COMMENT",   
  "EDIT",   
  "MANAGE",   
  "OWNER"  
]);  
  
// Core permission schema  
export const unifiedPermissionSchema = z.object({  
  id: z.string(),  
  userId: z.string().nullable(),  
  resourceType: resourceTypeSchema,  
  resourceId: z.string(),  
  permission: permissionLevelSchema,  
  sourceType: sourceTypeSchema,  
  sourceId: z.string().nullable(),  
  priority: z.number(),  
  createdAt: z.string(),  
  updatedAt: z.string(),  
  createdById: z.string(),  
  guestId: z.string().nullable(),  
});  
  
// Request schemas  
export const addUserPermissionSchema = z.object({  
  userId: z.string(),  
  resourceType: resourceTypeSchema,  
  resourceId: z.string(),  
  permission: permissionLevelSchema,  
});  
  
export const addGroupPermissionSchema = z.object({  
  groupId: z.string(),  
  resourceType: resourceTypeSchema,  
  resourceId: z.string(),  
  permission: permissionLevelSchema,  
});  
  
export const updatePermissionSchema = z.object({  
  permission: permissionLevelSchema,  
});  
  
export const permissionListRequestSchema = basePagerSchema.extend({  
  resourceType: resourceTypeSchema.optional(),  
  resourceId: z.string().optional(),  
  userId: z.string().optional(),  
});  
  
// Response schemas  
export const permissionResponseSchema = unifiedPermissionSchema.extend({  
  user: z.object({  
    id: z.string(),  
    email: z.string(),  
    displayName: z.string().nullable(),  
  }).nullable(),  
  group: z.object({  
    id: z.string(),  
    name: z.string(),  
  }).nullable(),  
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
  }),  
  data: z.object({  
    documents: z.array(DocSchema),  
  }),  
  policies: z.record(z.object({  
    read: z.boolean(),  
    update: z.boolean(),  
    delete: z.boolean(),  
    share: z.boolean(),  
    comment: z.boolean().optional(),  
  })),  
});  
  
// Types  
export type UnifiedPermission = z.infer<typeof unifiedPermissionSchema>;  
export type AddUserPermissionRequest = z.infer<typeof addUserPermissionSchema>;  
export type AddGroupPermissionRequest = z.infer<typeof addGroupPermissionSchema>;  
export type UpdatePermissionRequest = z.infer<typeof updatePermissionSchema>;  
export type PermissionListRequest = z.infer<typeof permissionListRequestSchema>;  
export type PermissionResponse = z.infer<typeof permissionResponseSchema>;  
export type SharedWithMeResponse = z.infer<typeof sharedWithMeResponseSchema>;
2. 