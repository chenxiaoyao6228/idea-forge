import { z } from 'zod';

export const AITokenUsageScalarFieldEnumSchema = z.enum(['id','userId','tokensUsed','lastResetDate','monthlyLimit','createdAt','updatedAt']);

export default AITokenUsageScalarFieldEnumSchema;
