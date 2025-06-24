import { z } from "zod";
import { ResourceTypeSchema } from "../inputTypeSchemas/ResourceTypeSchema";
import { PermissionLevelSchema } from "../inputTypeSchemas/PermissionLevelSchema";
import { SourceTypeSchema } from "../inputTypeSchemas/SourceTypeSchema";

/////////////////////////////////////////
// UNIFIED PERMISSION SCHEMA
/////////////////////////////////////////

export const UnifiedPermissionSchema = z.object({
  resourceType: ResourceTypeSchema,
  permission: PermissionLevelSchema,
  sourceType: SourceTypeSchema,
  id: z.string().cuid(),
  userId: z.string().nullable(),
  resourceId: z.string(),
  sourceId: z.string().nullable(),
  priority: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdById: z.string(),
  guestId: z.string().nullable(),
});

export type UnifiedPermission = z.infer<typeof UnifiedPermissionSchema>;

/////////////////////////////////////////
// UNIFIED PERMISSION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const UnifiedPermissionOptionalDefaultsSchema = UnifiedPermissionSchema.merge(
  z.object({
    id: z.string().cuid().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  }),
);

export type UnifiedPermissionOptionalDefaults = z.infer<typeof UnifiedPermissionOptionalDefaultsSchema>;

export default UnifiedPermissionSchema;
