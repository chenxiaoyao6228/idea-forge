import { z } from "zod";

/////////////////////////////////////////
// MEMBER GROUP USER SCHEMA
/////////////////////////////////////////

export const MemberGroupUserSchema = z.object({
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  groupId: z.string(),
  userId: z.string(),
});

export type MemberGroupUser = z.infer<typeof MemberGroupUserSchema>;

/////////////////////////////////////////
// MEMBER GROUP USER OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const MemberGroupUserOptionalDefaultsSchema = MemberGroupUserSchema.merge(
  z.object({
    id: z.string().cuid().optional(),
    createdAt: z.coerce.date().optional(),
  }),
);

export type MemberGroupUserOptionalDefaults = z.infer<typeof MemberGroupUserOptionalDefaultsSchema>;

export default MemberGroupUserSchema;
