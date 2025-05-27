import { z } from 'zod';

export const SubspaceTypeSchema = z.enum(['WORKSPACE_WIDE','PUBLIC','INVITE_ONLY','PRIVATE','PERSONAL']);

export type SubspaceTypeType = `${z.infer<typeof SubspaceTypeSchema>}`

export default SubspaceTypeSchema;
