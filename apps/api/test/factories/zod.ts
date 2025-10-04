import { createFixture } from "zod-fixture";
import {
  DocSchema,
  SubspaceSchema,
  UserSchema,
  WorkspaceSchema,
  MemberGroupSchema,
  WorkspaceMemberSchema,
  DocShareSchema,
  DocumentPermissionSchema,
  SubspaceMemberSchema,
} from "@idea/contracts";

export const generateMockDocument = (overrides = {}) => {
  const base = createFixture(DocSchema);
  // Patch contentBinary to be null or a valid Buffer/base64 string
  // Ensure nullable foreign keys are null by default to avoid FK constraint violations
  return {
    ...base,
    contentBinary: null, // or Buffer.from(''), or Buffer.from('test').toString('base64')
    parentId: null, // Set to null by default to avoid FK constraint violations
    subspaceId: null, // Set to null by default to avoid FK constraint violations
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

export const generateMockDocShare = (overrides = {}) => ({
  ...createFixture(DocShareSchema),
  ...overrides,
});

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
