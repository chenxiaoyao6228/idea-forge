import { z } from "zod";
import { DocTypeSchema } from "../inputTypeSchemas/DocTypeSchema";
import { DocVisibilitySchema } from "../inputTypeSchemas/DocVisibilitySchema";

/////////////////////////////////////////
// DOC SCHEMA
/////////////////////////////////////////

export const DocSchema = z.object({
  type: DocTypeSchema,
  visibility: DocVisibilitySchema,
  id: z.string().cuid(),
  title: z.string(),
  content: z.string(),
  contentBinary: z.instanceof(Buffer).nullable(),
  archivedAt: z.coerce.date().nullable(),
  publishedAt: z.coerce.date().nullable(),
  deletedAt: z.coerce.date().nullable(),
  parentId: z.string().nullable(),
  index: z.string().nullable(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  icon: z.string().nullable(),
  coverImageId: z.string().nullable(),
  authorId: z.string(),
  createdById: z.string(),
  lastModifiedById: z.string(),
  workspaceId: z.string(),
  subspaceId: z.string().nullable(),
});

export type Doc = z.infer<typeof DocSchema>;

/////////////////////////////////////////
// DOC OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const DocOptionalDefaultsSchema = DocSchema.merge(
  z.object({
    type: DocTypeSchema.optional(),
    visibility: DocVisibilitySchema.optional(),
    id: z.string().cuid().optional(),
    content: z.string().optional(),
    updatedAt: z.coerce.date().optional(),
    createdAt: z.coerce.date().optional(),
  }),
);

export type DocOptionalDefaults = z.infer<typeof DocOptionalDefaultsSchema>;

export default DocSchema;
