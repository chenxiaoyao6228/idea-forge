import { z } from 'zod';
import { PermissionLevelSchema } from '../inputTypeSchemas/PermissionLevelSchema'

/////////////////////////////////////////
// DOC SHARE SCHEMA
/////////////////////////////////////////

export const DocShareSchema = z.object({
  permission: PermissionLevelSchema,
  id: z.string().cuid(),
  docId: z.string(),
  authorId: z.string(),
  userId: z.string(),
  includeChildDocuments: z.boolean(),
  published: z.boolean(),
  revokedAt: z.coerce.date().nullable(),
  expiresAt: z.coerce.date().nullable(),
  urlId: z.string().nullable(),
  viewCount: z.number().int(),
  lastAccessedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type DocShare = z.infer<typeof DocShareSchema>

/////////////////////////////////////////
// DOC SHARE OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const DocShareOptionalDefaultsSchema = DocShareSchema.merge(z.object({
  permission: PermissionLevelSchema.optional(),
  id: z.string().cuid().optional(),
  includeChildDocuments: z.boolean().optional(),
  published: z.boolean().optional(),
  viewCount: z.number().int().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type DocShareOptionalDefaults = z.infer<typeof DocShareOptionalDefaultsSchema>

export default DocShareSchema;
