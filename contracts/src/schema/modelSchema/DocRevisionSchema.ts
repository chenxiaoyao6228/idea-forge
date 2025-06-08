import { z } from 'zod';

/////////////////////////////////////////
// DOC REVISION SCHEMA
/////////////////////////////////////////

export const DocRevisionSchema = z.object({
  id: z.string().cuid(),
  title: z.string(),
  content: z.string(),
  contentBinary: z.instanceof(Buffer).nullable(),
  createdAt: z.coerce.date(),
  docId: z.string(),
  authorId: z.string(),
})

export type DocRevision = z.infer<typeof DocRevisionSchema>

/////////////////////////////////////////
// DOC REVISION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const DocRevisionOptionalDefaultsSchema = DocRevisionSchema.merge(z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
}))

export type DocRevisionOptionalDefaults = z.infer<typeof DocRevisionOptionalDefaultsSchema>

export default DocRevisionSchema;
