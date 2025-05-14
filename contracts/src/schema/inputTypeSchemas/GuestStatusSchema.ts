import { z } from 'zod';

export const GuestStatusSchema = z.enum(['PENDING','ACTIVE','EXPIRED','REVOKED']);

export type GuestStatusType = `${z.infer<typeof GuestStatusSchema>}`

export default GuestStatusSchema;
