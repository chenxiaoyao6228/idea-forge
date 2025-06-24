import { z } from "zod";

export const MemberGroupScalarFieldEnumSchema = z.enum(["id", "name", "description", "createdAt", "updatedAt", "validUntil", "workspaceId"]);

export default MemberGroupScalarFieldEnumSchema;
