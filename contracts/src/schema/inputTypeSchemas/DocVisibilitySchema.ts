import { z } from 'zod';

export const DocVisibilitySchema = z.enum(['PUBLIC','PRIVATE','WORKSPACE']);

export type DocVisibilityType = `${z.infer<typeof DocVisibilitySchema>}`

export default DocVisibilitySchema;
