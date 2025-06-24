import { z } from "zod";

/////////////////////////////////////////
// USER LOGIN HISTORY SCHEMA
/////////////////////////////////////////

export const UserLoginHistorySchema = z.object({
  id: z.string().cuid(),
  userId: z.string(),
  ip: z.string().nullable(),
  location: z.string().nullable(),
  loginTime: z.coerce.date(),
});

export type UserLoginHistory = z.infer<typeof UserLoginHistorySchema>;

/////////////////////////////////////////
// USER LOGIN HISTORY OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const UserLoginHistoryOptionalDefaultsSchema = UserLoginHistorySchema.merge(
  z.object({
    id: z.string().cuid().optional(),
    loginTime: z.coerce.date().optional(),
  }),
);

export type UserLoginHistoryOptionalDefaults = z.infer<typeof UserLoginHistoryOptionalDefaultsSchema>;

export default UserLoginHistorySchema;
