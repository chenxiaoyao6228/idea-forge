/**
 * Resource-specific permission hooks
 * These hooks provide convenient, type-safe permission checking for specific resources.
 * Use these instead of `useAbilityCan` directly for better developer experience.
 */

// Hook exports
export { useDocumentPermissions } from "./use-document-permissions";
export { useWorkspacePermissions } from "./use-workspace-permissions";
export { useSubspacePermissions } from "./use-subspace-permissions";
