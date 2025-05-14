import { z } from 'zod';

export const WorkspaceRoleSchema = z.enum(['OWNER','ADMIN','MEMBER']);

export type WorkspaceRoleType = `${z.infer<typeof WorkspaceRoleSchema>}`

export default WorkspaceRoleSchema;
