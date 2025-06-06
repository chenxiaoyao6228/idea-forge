import { z } from 'zod';
import { PermissionSchema } from '../inputTypeSchemas/PermissionSchema'

/////////////////////////////////////////
// DOC USER PERMISSION SCHEMA
/////////////////////////////////////////

export const DocUserPermissionSchema = z.object({
  permission: PermissionSchema,
  id: z.string().cuid(),
  index: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  docId: z.string(),
  userId: z.number().int(),
  createdById: z.number().int(),
  sourceId: z.string().nullable(),
  workspaceMemberId: z.string().nullable(),
  subspaceMemberId: z.string().nullable(),
})

export type DocUserPermission = z.infer<typeof DocUserPermissionSchema>

/////////////////////////////////////////
// DOC USER PERMISSION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const DocUserPermissionOptionalDefaultsSchema = DocUserPermissionSchema.merge(z.object({
  permission: PermissionSchema.optional(),
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type DocUserPermissionOptionalDefaults = z.infer<typeof DocUserPermissionOptionalDefaultsSchema>

export default DocUserPermissionSchema;
