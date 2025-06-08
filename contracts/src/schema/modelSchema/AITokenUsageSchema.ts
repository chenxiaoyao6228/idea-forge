import { z } from 'zod';

/////////////////////////////////////////
// AI TOKEN USAGE SCHEMA
/////////////////////////////////////////

export const AITokenUsageSchema = z.object({
  id: z.string().cuid(),
  userId: z.string(),
  tokensUsed: z.number().int(),
  lastResetDate: z.coerce.date(),
  monthlyLimit: z.number().int(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type AITokenUsage = z.infer<typeof AITokenUsageSchema>

/////////////////////////////////////////
// AI TOKEN USAGE OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const AITokenUsageOptionalDefaultsSchema = AITokenUsageSchema.merge(z.object({
  id: z.string().cuid().optional(),
  tokensUsed: z.number().int().optional(),
  lastResetDate: z.coerce.date().optional(),
  monthlyLimit: z.number().int().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type AITokenUsageOptionalDefaults = z.infer<typeof AITokenUsageOptionalDefaultsSchema>

export default AITokenUsageSchema;
