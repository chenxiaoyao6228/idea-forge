import { z } from 'zod';

export const StarScalarFieldEnumSchema = z.enum(['id','index','createdAt','updatedAt','userId','docId','subspaceId']);

export default StarScalarFieldEnumSchema;
