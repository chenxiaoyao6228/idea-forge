import { z } from 'zod';
import { GuestStatusSchema } from '../inputTypeSchemas/GuestStatusSchema'

/////////////////////////////////////////
// GUEST COLLABORATOR SCHEMA
/////////////////////////////////////////

export const GuestCollaboratorSchema = z.object({
  status: GuestStatusSchema,
  id: z.string().cuid(),
  email: z.string(),
  name: z.string().nullable(),
  expireAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  invitedById: z.number().int(),
  workspaceId: z.string(),
})

export type GuestCollaborator = z.infer<typeof GuestCollaboratorSchema>

/////////////////////////////////////////
// GUEST COLLABORATOR OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const GuestCollaboratorOptionalDefaultsSchema = GuestCollaboratorSchema.merge(z.object({
  status: GuestStatusSchema.optional(),
  id: z.string().cuid().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}))

export type GuestCollaboratorOptionalDefaults = z.infer<typeof GuestCollaboratorOptionalDefaultsSchema>

export default GuestCollaboratorSchema;
