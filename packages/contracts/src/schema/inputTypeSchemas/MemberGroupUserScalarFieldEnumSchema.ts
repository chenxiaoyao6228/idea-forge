import { z } from "zod";

export const MemberGroupUserScalarFieldEnumSchema = z.enum(["id", "createdAt", "groupId", "userId"]);

export default MemberGroupUserScalarFieldEnumSchema;
