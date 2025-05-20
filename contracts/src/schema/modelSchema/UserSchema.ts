import { z } from 'zod';
import { UserStatusSchema } from '../inputTypeSchemas/UserStatusSchema'

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  status: UserStatusSchema,
  id: z.number().int(),
  email: z.string(),
  displayName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  emailVerified: z.coerce.date().nullable(),
  created_time: z.coerce.date(),
  updated_time: z.coerce.date(),
  hashedRefreshToken: z.string().nullable(),
})

export type User = z.infer<typeof UserSchema>

/////////////////////////////////////////
// USER OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const UserOptionalDefaultsSchema = UserSchema.merge(z.object({
  status: UserStatusSchema.optional(),
  id: z.number().int().optional(),
  created_time: z.coerce.date().optional(),
  updated_time: z.coerce.date().optional(),
}))

export type UserOptionalDefaults = z.infer<typeof UserOptionalDefaultsSchema>

export default UserSchema;
