import { z } from "zod";
import { NullableJsonValue } from "../inputTypeSchemas/NullableJsonValue";

/////////////////////////////////////////
// WORKSPACE SCHEMA
/////////////////////////////////////////

export const WorkspaceSchema = z.object({
  id: z.string().cuid(),
  allowPublicDocs: z.boolean(),
  name: z.string(),
  description: z.string().nullable(),
  avatar: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  settings: NullableJsonValue.optional(),
});

export type Workspace = z.infer<typeof WorkspaceSchema>;

/////////////////////////////////////////
// WORKSPACE OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const WorkspaceOptionalDefaultsSchema = WorkspaceSchema.merge(
  z.object({
    id: z.string().cuid().optional(),
    allowPublicDocs: z.boolean().optional(),
    createdAt: z.coerce.date().optional(),
    updatedAt: z.coerce.date().optional(),
  }),
);

export type WorkspaceOptionalDefaults = z.infer<typeof WorkspaceOptionalDefaultsSchema>;

export default WorkspaceSchema;
