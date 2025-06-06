import { z } from 'zod';

export const DocUserPermissionScalarFieldEnumSchema = z.enum(['id','permission','index','createdAt','updatedAt','docId','userId','createdById','sourceId','workspaceMemberId','subspaceMemberId']);

export default DocUserPermissionScalarFieldEnumSchema;
