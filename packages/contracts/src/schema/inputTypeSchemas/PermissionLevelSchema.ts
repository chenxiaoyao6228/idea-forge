import { z } from "zod";

export const PermissionLevelSchema = z.enum(["NONE", "READ", "COMMENT", "EDIT", "MANAGE", "OWNER"]);

export type PermissionLevelType = `${z.infer<typeof PermissionLevelSchema>}`;

export default PermissionLevelSchema;
