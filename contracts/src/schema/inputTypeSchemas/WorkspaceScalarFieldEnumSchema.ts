import { z } from 'zod';

export const WorkspaceScalarFieldEnumSchema = z.enum(['id','allowPublicDocs','name','description','avatar','createdAt','updatedAt','settings']);

export default WorkspaceScalarFieldEnumSchema;
