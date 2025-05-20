import { z } from 'zod';
import { PermissionSchema } from '../inputTypeSchemas/PermissionSchema'

/////////////////////////////////////////
// DOC GROUP PERMISSION SCHEMA
/////////////////////////////////////////

export const DocGroupPermissionSchema = z.object({
  permission: PermissionSchema,
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  docId: z.string(),
  groupId: z.string(),
})

export type DocGroupPermission = z.infer<typeof DocGroupPermissionSchema>

/////////////////////////////////////////
// DOC GROUP PERMISSION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const DocGroupPermissionOptionalDefaultsSchema = DocGroupPermissionSchema.merge(z.object({
  permission: PermissionSchema.optional(),
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type DocGroupPermissionOptionalDefaults = z.infer<typeof DocGroupPermissionOptionalDefaultsSchema>

export default DocGroupPermissionSchema;
