import { z } from "zod";

export const CoverImageScalarFieldEnumSchema = z.enum(["id", "url", "scrollY", "docId", "isPreset"]);

export default CoverImageScalarFieldEnumSchema;
