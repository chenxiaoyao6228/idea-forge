import { z } from 'zod';

export const SubspaceRoleSchema = z.enum(['ADMIN','MEMBER']);

export type SubspaceRoleType = `${z.infer<typeof SubspaceRoleSchema>}`

export default SubspaceRoleSchema;
