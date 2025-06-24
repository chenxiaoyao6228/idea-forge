import { z } from "zod";

export const GuestCollaboratorScalarFieldEnumSchema = z.enum([
  "id",
  "email",
  "name",
  "status",
  "expireAt",
  "createdAt",
  "updatedAt",
  "invitedById",
  "workspaceId",
]);

export default GuestCollaboratorScalarFieldEnumSchema;
