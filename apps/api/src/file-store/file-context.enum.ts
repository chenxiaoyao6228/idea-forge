/**
 * File Context Enum
 *
 * Defines different contexts for file storage organization
 * Each context maps to a specific path pattern in the OSS bucket
 */
export enum FileContext {
  // System assets (public, CDN-friendly)
  SYSTEM_COVER = "system-cover",
  SYSTEM_TEMPLATE = "system-template",

  // Current user uploads
  USER_IMAGE = "user-image",
  USER_OTHER = "user-other",

  // Import (Phase 1)
  IMPORT_TEMP = "import-temp",
  IMPORT_ATTACHMENT = "import-attachment",

  // Documents (Phase 1)
  DOCUMENT_COVER = "document-cover",
  DOCUMENT_ATTACHMENT = "document-attachment",
}
