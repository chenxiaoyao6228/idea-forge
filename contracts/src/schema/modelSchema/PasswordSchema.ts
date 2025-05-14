import { z } from 'zod';

/////////////////////////////////////////
// PASSWORD SCHEMA
/////////////////////////////////////////

export const PasswordSchema = z.object({
  hash: z.string(),
  userId: z.number().int(),
})

export type Password = z.infer<typeof PasswordSchema>

/////////////////////////////////////////
// PASSWORD OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const PasswordOptionalDefaultsSchema = PasswordSchema.merge(z.object({
}))

export type PasswordOptionalDefaults = z.infer<typeof PasswordOptionalDefaultsSchema>

export default PasswordSchema;
