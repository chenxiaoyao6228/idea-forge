import { z } from "zod";

/////////////////////////////////////////
// COVER IMAGE SCHEMA
/////////////////////////////////////////

export const CoverImageSchema = z.object({
  id: z.string().cuid(),
  url: z.string(),
  scrollY: z.number(),
  docId: z.string(),
  isPreset: z.boolean(),
});

export type CoverImage = z.infer<typeof CoverImageSchema>;

/////////////////////////////////////////
// COVER IMAGE OPTIONAL DEFAULTS SCHEMA
/////////////////////////////////////////

export const CoverImageOptionalDefaultsSchema = CoverImageSchema.merge(
  z.object({
    id: z.string().cuid().optional(),
    isPreset: z.boolean().optional(),
  }),
);

export type CoverImageOptionalDefaults = z.infer<typeof CoverImageOptionalDefaultsSchema>;

export default CoverImageSchema;
