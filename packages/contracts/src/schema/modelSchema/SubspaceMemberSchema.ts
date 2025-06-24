import { z } from "zod";
import { SubspaceRoleSchema } from "../inputTypeSchemas/SubspaceRoleSchema";

/////////////////////////////////////////
// SUBSPACE MEMBER SCHEMA
/////////////////////////////////////////

export const SubspaceMemberSchema = z.object({
  role: SubspaceRoleSchema,
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  subspaceId: z.string(),
  userId: z.string(),
});

export type SubspaceMember = z.infer<typeof SubspaceMemberSchema>;

/////////////////////////////////////////
// SUBSPACE MEMBER OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const SubspaceMemberOptionalDefaultsSchema = SubspaceMemberSchema.merge(
  z.object({
    role: SubspaceRoleSchema.optional(),
    id: z.string().cuid().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  }),
);

export type SubspaceMemberOptionalDefaults = z.infer<typeof SubspaceMemberOptionalDefaultsSchema>;

export default SubspaceMemberSchema;
