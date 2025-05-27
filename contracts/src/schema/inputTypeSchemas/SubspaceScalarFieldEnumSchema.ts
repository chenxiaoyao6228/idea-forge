import { z } from 'zod';

export const SubspaceScalarFieldEnumSchema = z.enum(['id','name','description','avatar','type','createdAt','updatedAt','settings','isArchived','navigationTree','workspaceId']);

export default SubspaceScalarFieldEnumSchema;
