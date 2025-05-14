import { z } from 'zod';

export const DocShareScalarFieldEnumSchema = z.enum(['id','docId','authorId','userId','permission','createdAt','updatedAt']);

export default DocShareScalarFieldEnumSchema;
