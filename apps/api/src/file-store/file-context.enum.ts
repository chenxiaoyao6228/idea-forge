/**
 * File Context Enum
 *
 * Defines different contexts for file storage organization
 * Each context maps to a specific path pattern in the OSS bucket
 */
export enum FileContext {
  // System assets (admin-only, public resources)
  SYSTEM = "system",

  // User uploads (avatars, temp files, general uploads)
  USER = "user",

  // Document content (covers, attachments, imported images)
  DOCUMENT = "document",
}
