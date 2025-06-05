import { z } from 'zod';

export const DocShareScalarFieldEnumSchema = z.enum(['id','docId','authorId','userId','permission','includeChildDocuments','published','revokedAt','expiresAt','urlId','viewCount','lastAccessedAt','createdAt','updatedAt']);

export default DocShareScalarFieldEnumSchema;
