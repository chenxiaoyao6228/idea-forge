import { z } from "zod";

export const ConnectionScalarFieldEnumSchema = z.enum(["id", "providerName", "providerId", "createdAt", "updatedAt", "userId"]);

export default ConnectionScalarFieldEnumSchema;
