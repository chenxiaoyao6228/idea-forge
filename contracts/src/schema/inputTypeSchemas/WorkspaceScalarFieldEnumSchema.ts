import { z } from 'zod';

export const WorkspaceScalarFieldEnumSchema = z.enum(['id','name','description','avatar','createdAt','updatedAt']);

export default WorkspaceScalarFieldEnumSchema;
