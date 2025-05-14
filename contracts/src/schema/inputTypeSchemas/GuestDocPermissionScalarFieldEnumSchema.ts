import { z } from 'zod';

export const GuestDocPermissionScalarFieldEnumSchema = z.enum(['id','permission','expireAt','createdAt','guestId','docId']);

export default GuestDocPermissionScalarFieldEnumSchema;
