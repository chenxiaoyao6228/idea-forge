import { z } from "zod";

export const UserStatusSchema = z.enum(["PENDING", "ACTIVE", "SUSPENDED", "REVOKED", "ARCHIVED"]);

export type UserStatusType = `${z.infer<typeof UserStatusSchema>}`;

export default UserStatusSchema;
