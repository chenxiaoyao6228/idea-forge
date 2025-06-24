import { z } from "zod";

export const DocTypeSchema = z.enum(["NOTE", "WHITEBOARD", "MIND"]);

export type DocTypeType = `${z.infer<typeof DocTypeSchema>}`;

export default DocTypeSchema;
