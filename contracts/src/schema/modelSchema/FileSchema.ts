import { z } from 'zod';

/////////////////////////////////////////
// FILE SCHEMA
/////////////////////////////////////////

export const FileSchema = z.object({
  id: z.string().cuid(),
  key: z.string(),
  url: z.string(),
  status: z.string(),
  size: z.number().int(),
  userId: z.string(),
  contentType: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type File = z.infer<typeof FileSchema>

/////////////////////////////////////////
// FILE OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const FileOptionalDefaultsSchema = FileSchema.merge(z.object({
  id: z.string().cuid().optional(),
  url: z.string().optional(),
  status: z.string().optional(),
  size: z.number().int().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type FileOptionalDefaults = z.infer<typeof FileOptionalDefaultsSchema>

export default FileSchema;
