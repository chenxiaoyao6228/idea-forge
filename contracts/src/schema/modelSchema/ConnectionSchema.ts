import { z } from 'zod';

/////////////////////////////////////////
// CONNECTION SCHEMA
/////////////////////////////////////////

export const ConnectionSchema = z.object({
  id: z.string().cuid(),
  providerName: z.string(),
  providerId: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.number().int(),
})

export type Connection = z.infer<typeof ConnectionSchema>

/////////////////////////////////////////
// CONNECTION OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const ConnectionOptionalDefaultsSchema = ConnectionSchema.merge(z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type ConnectionOptionalDefaults = z.infer<typeof ConnectionOptionalDefaultsSchema>

export default ConnectionSchema;
