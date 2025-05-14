import { z } from 'zod';

export const WorkspaceMemberScalarFieldEnumSchema = z.enum(['id','role','createdAt','updatedAt','workspaceId','userId']);

export default WorkspaceMemberScalarFieldEnumSchema;
