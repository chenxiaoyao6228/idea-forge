import {
  generateMockSubspace,
  generateMockUser,
  generateMockWorkspace,
  generateMockDocument,
  generateMockDocShare,
  generateMockWorkspaceMember,
} from "@test/mocks/data/zod";
import { getTestPrisma } from "@test/setup/test-container-setup";

export async function buildDocument(overrides: any = {}) {
  const prisma = getTestPrisma();

  if (!overrides.workspaceId) {
    const workspace = await buildWorkspace();
    overrides.workspaceId = workspace.id;
  }
  if (!overrides.authorId) {
    const user = await buildUser();
    overrides.authorId = user.id;
    overrides.createdById = user.id;
    overrides.lastModifiedById = user.id;
  }
  return await prisma.doc.create({
    data: {
      ...generateMockDocument(),
      ...overrides,
    },
  });
}

export async function buildSubspace(overrides: any = {}) {
  const prisma = getTestPrisma();

  if (!overrides.workspaceId) {
    const workspace = await buildWorkspace();
    overrides.workspaceId = workspace.id;
  }
  return await prisma.subspace.create({
    data: {
      ...generateMockSubspace(),
      ...overrides,
    },
  });
}

export async function buildWorkspace(overrides: any = {}) {
  const prisma = getTestPrisma();
  return await prisma.workspace.create({
    data: {
      ...generateMockWorkspace(),
      ...overrides,
    },
  });
}

export async function buildUser(overrides: any = {}) {
  const prisma = getTestPrisma();
  return await prisma.user.create({
    data: {
      ...generateMockUser(),
      ...overrides,
    },
  });
}

export async function buildDocShare(overrides: any = {}) {
  const prisma = getTestPrisma();
  if (!overrides.docId) {
    const doc = await buildDocument();
    overrides.docId = doc.id;
  }
  if (!overrides.authorId) {
    const user = await buildUser();
    overrides.authorId = user.id;
  }
  if (!overrides.userId) {
    const user = await buildUser();
    overrides.userId = user.id;
  }
  return await prisma.docShare.create({
    data: {
      ...generateMockDocShare(),
      ...overrides,
    },
  });
}

export async function buildWorkspaceMember(overrides: any = {}) {
  const prisma = getTestPrisma();
  if (!overrides.workspaceId) {
    const workspace = await buildWorkspace();
    overrides.workspaceId = workspace.id;
  }
  if (!overrides.userId) {
    const user = await buildUser();
    overrides.userId = user.id;
  }
  return await prisma.workspaceMember.create({
    data: {
      ...generateMockWorkspaceMember(),
      ...overrides,
    },
  });
}
