import { z } from 'zod';

export const DocGroupPermissionScalarFieldEnumSchema = z.enum(['id','permission','createdAt','updatedAt','docId','groupId','userId','createdById','sourceId']);

export default DocGroupPermissionScalarFieldEnumSchema;
