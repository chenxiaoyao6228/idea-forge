import { z } from 'zod';

export const SubspaceScalarFieldEnumSchema = z.enum(['id','name','description','avatar','type','createdAt','updatedAt','workspaceId']);

export default SubspaceScalarFieldEnumSchema;
