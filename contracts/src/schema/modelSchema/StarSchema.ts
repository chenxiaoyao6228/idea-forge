import { z } from 'zod';

/////////////////////////////////////////
// STAR SCHEMA
/////////////////////////////////////////

export const StarSchema = z.object({
  id: z.string().cuid(),
  index: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.number().int(),
  docId: z.string().nullable(),
  subspaceId: z.string().nullable(),
})

export type Star = z.infer<typeof StarSchema>

/////////////////////////////////////////
// STAR OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const StarOptionalDefaultsSchema = StarSchema.merge(z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type StarOptionalDefaults = z.infer<typeof StarOptionalDefaultsSchema>

export default StarSchema;
