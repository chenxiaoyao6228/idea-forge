import { z } from 'zod';

/////////////////////////////////////////
// PUBLIC SHARE SCHEMA
/////////////////////////////////////////

export const PublicShareSchema = z.object({
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  docId: z.string(),
  expiresAt: z.coerce.date().nullable(),
  allowEdit: z.boolean(),
  allowComment: z.boolean(),
  allowCopy: z.boolean(),
  showTemplate: z.boolean(),
  showSidebar: z.boolean(),
  viewCount: z.number().int(),
  creatorId: z.number().int(),
  accessCode: z.string().nullable(),
})

export type PublicShare = z.infer<typeof PublicShareSchema>

/////////////////////////////////////////
// PUBLIC SHARE OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const PublicShareOptionalDefaultsSchema = PublicShareSchema.merge(z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  allowEdit: z.boolean().optional(),
  allowComment: z.boolean().optional(),
  allowCopy: z.boolean().optional(),
  showTemplate: z.boolean().optional(),
  showSidebar: z.boolean().optional(),
  viewCount: z.number().int().optional(),
}))

export type PublicShareOptionalDefaults = z.infer<typeof PublicShareOptionalDefaultsSchema>

export default PublicShareSchema;
