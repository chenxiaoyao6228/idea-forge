import { z } from 'zod';
import { NullableJsonValue } from '../inputTypeSchemas/NullableJsonValue'
import { SubspaceTypeSchema } from '../inputTypeSchemas/SubspaceTypeSchema'

/////////////////////////////////////////
// SUBSPACE SCHEMA
/////////////////////////////////////////

export const SubspaceSchema = z.object({
  type: SubspaceTypeSchema,
  id: z.string().cuid(),
  name: z.string(),
  description: z.string().nullable(),
  avatar: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  settings: NullableJsonValue.optional(),
  isArchived: z.boolean(),
  navigationTree: NullableJsonValue.optional(),
  workspaceId: z.string(),
})

export type Subspace = z.infer<typeof SubspaceSchema>

/////////////////////////////////////////
// SUBSPACE OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const SubspaceOptionalDefaultsSchema = SubspaceSchema.merge(z.object({
  type: SubspaceTypeSchema.optional(),
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  isArchived: z.boolean().optional(),
}))

export type SubspaceOptionalDefaults = z.infer<typeof SubspaceOptionalDefaultsSchema>

export default SubspaceSchema;
