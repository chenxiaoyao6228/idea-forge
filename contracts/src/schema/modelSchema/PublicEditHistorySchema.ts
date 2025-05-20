import { z } from 'zod';
import { InputJsonValue } from '../inputTypeSchemas/InputJsonValue'

/////////////////////////////////////////
// PUBLIC EDIT HISTORY SCHEMA
/////////////////////////////////////////

export const PublicEditHistorySchema = z.object({
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  shareId: z.string(),
  editorId: z.string().nullable(),
  editorName: z.string(),
  editorIp: z.string(),
  operation: InputJsonValue,
})

export type PublicEditHistory = z.infer<typeof PublicEditHistorySchema>

/////////////////////////////////////////
// PUBLIC EDIT HISTORY OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const PublicEditHistoryOptionalDefaultsSchema = PublicEditHistorySchema.merge(z.object({
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
}))

export type PublicEditHistoryOptionalDefaults = z.infer<typeof PublicEditHistoryOptionalDefaultsSchema>

export default PublicEditHistorySchema;
