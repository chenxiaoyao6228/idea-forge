import { z } from 'zod';

export const WorkspaceMemberScalarFieldEnumSchema = z.enum(['id','role','createdAt','updatedAt','preferences','index','workspaceId','userId']);

export default WorkspaceMemberScalarFieldEnumSchema;
