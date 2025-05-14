import { z } from 'zod';

/////////////////////////////////////////
// DOC SCHEMA
/////////////////////////////////////////

export const DocSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  content: z.string(),
  contentBinary: z.instanceof(Buffer).nullable(),
  isArchived: z.boolean(),
  isStarred: z.boolean(),
  isPrivate: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  ownerId: z.number().int(),
  parentId: z.string().nullable(),
  icon: z.string().nullable(),
  coverImageId: z.string().nullable(),
  position: z.number().int(),
  subspaceId: z.string().nullable(),
})

export type Doc = z.infer<typeof DocSchema>

/////////////////////////////////////////
// DOC OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const DocOptionalDefaultsSchema = DocSchema.merge(z.object({
  id: z.string().cuid().optional(),
  isArchived: z.boolean().optional(),
  isStarred: z.boolean().optional(),
  isPrivate: z.boolean().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  position: z.number().int().optional(),
}))

export type DocOptionalDefaults = z.infer<typeof DocOptionalDefaultsSchema>

export default DocSchema;
