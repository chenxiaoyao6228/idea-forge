import { z } from "zod";

export const UserScalarFieldEnumSchema = z.enum([
  "id",
  "email",
  "displayName",
  "imageUrl",
  "emailVerified",
  "status",
  "createdAt",
  "updatedAt",
  "hashedRefreshToken",
]);

export default UserScalarFieldEnumSchema;
