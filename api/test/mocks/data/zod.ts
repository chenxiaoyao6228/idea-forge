import { createFixture } from "zod-fixture";
import {
  DocSchema,
  SubspaceSchema,
  UserSchema,
  WorkspaceSchema,
  MemberGroupSchema,
  WorkspaceMemberSchema,
  DocShareSchema,
} from "contracts";

export const generateMockDocument = (overrides = {}) => {
  const base = createFixture(DocSchema);
  // Patch contentBinary to be null or a valid Buffer/base64 string
  return {
    ...base,
    contentBinary: null, // or Buffer.from(''), or Buffer.from('test').toString('base64')
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

export const generateMockSubspace = (overrides = {}) => ({
  ...createFixture(SubspaceSchema),
  ...overrides,
});

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
