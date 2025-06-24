import { z } from "zod";

/////////////////////////////////////////
// MEMBER GROUP SCHEMA
/////////////////////////////////////////

export const MemberGroupSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  validUntil: z.coerce.date().nullable(),
  workspaceId: z.string(),
});

export type MemberGroup = z.infer<typeof MemberGroupSchema>;

/////////////////////////////////////////
// MEMBER GROUP OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const MemberGroupOptionalDefaultsSchema = MemberGroupSchema.merge(
  z.object({
    id: z.string().cuid().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  }),
);

export type MemberGroupOptionalDefaults = z.infer<typeof MemberGroupOptionalDefaultsSchema>;

export default MemberGroupSchema;
