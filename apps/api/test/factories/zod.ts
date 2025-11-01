import { createFixture } from "zod-fixture";
import {
  DocSchema,
  SubspaceSchema,
  UserSchema,
  WorkspaceSchema,
  MemberGroupSchema,
  WorkspaceMemberSchema,
  DocumentPermissionSchema,
  SubspaceMemberSchema,
} from "@idea/contracts";
// DocShareSchema removed - DocShare model has been replaced with PublicShare

export const generateMockDocument = (overrides = {}) => {
  const base = createFixture(DocSchema);
  // Patch contentBinary to be null or a valid Buffer/base64 string
  // Ensure nullable foreign keys are null by default to avoid FK constraint violations
  // Set deletedAt to null to avoid documents being created in deleted state
  return {
    ...base,
    contentBinary: null, // or Buffer.from(''), or Buffer.from('test').toString('base64')
    parentId: null, // Set to null by default to avoid FK constraint violations
    subspaceId: null, // Set to null by default to avoid FK constraint violations
    deletedAt: null, // Set to null to avoid creating already-deleted documents
    deletedById: null, // Set to null as well
    ...overrides,
  };
};

export const generateMockUser = (overrides = {}) => ({
  ...createFixture(UserSchema),
  ...overrides,
});

export const generateMockWorkspace = (overrides = {}) => ({
  ...createFixture(WorkspaceSchema),
  ...overrides,
});

export const generateMockSubspace = (overrides = {}) => {
  const base = createFixture(SubspaceSchema);
  // Set default permission levels and subspace type to avoid random values affecting tests
  return {
    ...base,
    type: "PUBLIC",
    subspaceAdminPermission: "MANAGE",
    subspaceMemberPermission: "MANAGE",
    nonSubspaceMemberPermission: "COMMENT",
    ...overrides,
  };
};

export const generateMockGroup = (overrides = {}) => ({
  ...createFixture(MemberGroupSchema),
  ...overrides,
});

// generateMockDocShare removed - DocShare model has been replaced with PublicShare

export const generateMockWorkspaceMember = (overrides = {}) => ({
  ...createFixture(WorkspaceMemberSchema),
  ...overrides,
});

export const generateMockDocumentPermission = (overrides = {}) => {
  const base = createFixture(DocumentPermissionSchema);
  // Ensure nullable foreign keys are null by default to avoid FK constraint violations
  // This prevents issues when random IDs don't correspond to existing records
  const result = {
    ...base,
    // Set nullable foreign keys to null by default
    userId: null,
    guestCollaboratorId: null,
    inheritedFromId: null,
    ...overrides,
  };

  return result;
};

export const generateMockSubspaceMember = (overrides = {}) => ({
  ...createFixture(SubspaceMemberSchema),
  ...overrides,
});

export const generateMockPublicShare = (overrides = {}) => {
  // PublicShare doesn't have a schema in contracts, so we'll create it manually
  return {
    token: `cuid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    urlId: null,
    permission: "READ",
    published: true,
    expiresAt: null,
    revokedAt: null,
    revokedById: null,
    views: 0,
    lastAccessedAt: null,
    allowIndexing: false,
    ...overrides,
  };
};
