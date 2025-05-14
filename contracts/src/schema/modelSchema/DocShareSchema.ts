import { z } from 'zod';
import { PermissionSchema } from '../inputTypeSchemas/PermissionSchema'

/////////////////////////////////////////
// DOC SHARE SCHEMA
/////////////////////////////////////////

export const DocShareSchema = z.object({
  permission: PermissionSchema,
  id: z.string().cuid(),
  docId: z.string(),
  authorId: z.number().int(),
  userId: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type DocShare = z.infer<typeof DocShareSchema>

/////////////////////////////////////////
// DOC SHARE OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const DocShareOptionalDefaultsSchema = DocShareSchema.merge(z.object({
  permission: PermissionSchema.optional(),
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type DocShareOptionalDefaults = z.infer<typeof DocShareOptionalDefaultsSchema>

export default DocShareSchema;
