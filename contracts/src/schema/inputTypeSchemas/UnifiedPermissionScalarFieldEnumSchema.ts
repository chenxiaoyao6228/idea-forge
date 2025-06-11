import { z } from 'zod';

export const UnifiedPermissionScalarFieldEnumSchema = z.enum(['id','userId','resourceType','resourceId','permission','sourceType','sourceId','priority','createdAt','updatedAt','createdById','guestId']);

export default UnifiedPermissionScalarFieldEnumSchema;
