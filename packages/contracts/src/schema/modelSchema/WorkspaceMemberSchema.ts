import { z } from "zod";
import { NullableJsonValue } from "../inputTypeSchemas/NullableJsonValue";
import { WorkspaceRoleSchema } from "../inputTypeSchemas/WorkspaceRoleSchema";

/////////////////////////////////////////
// WORKSPACE MEMBER SCHEMA
/////////////////////////////////////////

export const WorkspaceMemberSchema = z.object({
  role: WorkspaceRoleSchema,
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  preferences: NullableJsonValue.optional(),
  index: z.string().nullable(),
  workspaceId: z.string(),
  userId: z.string(),
});

export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>;

/////////////////////////////////////////
// WORKSPACE MEMBER OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const WorkspaceMemberOptionalDefaultsSchema = WorkspaceMemberSchema.merge(
  z.object({
    role: WorkspaceRoleSchema.optional(),
    id: z.string().cuid().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  }),
);

export type WorkspaceMemberOptionalDefaults = z.infer<typeof WorkspaceMemberOptionalDefaultsSchema>;

export default WorkspaceMemberSchema;
