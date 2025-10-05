import {
  generateMockSubspace,
  generateMockUser,
  generateMockWorkspace,
  generateMockDocument,
  generateMockDocShare,
  generateMockWorkspaceMember,
  generateMockDocumentPermission,
  generateMockSubspaceMember,
} from "./zod";
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
  }
  // Always set createdById and lastModifiedById if not provided
  if (!overrides.createdById) {
    overrides.createdById = overrides.authorId;
  }
  if (!overrides.lastModifiedById) {
    overrides.lastModifiedById = overrides.authorId;
  }

  // If subspaceId is provided, ensure the subspace exists
  if (overrides.subspaceId) {
    const subspaceExists = await prisma.subspace.findUnique({
      where: { id: overrides.subspaceId },
      select: { id: true },
    });
    if (!subspaceExists) {
      throw new Error(`Subspace with id ${overrides.subspaceId} does not exist`);
    }
  }

  // If parentId is provided, ensure the parent document exists
  if (overrides.parentId && !overrides._skipParentCheck) {
    const parentExists = await prisma.doc.findUnique({
      where: { id: overrides.parentId },
      select: { id: true },
    });
    if (!parentExists) {
      throw new Error(`Parent document with id ${overrides.parentId} does not exist`);
    }
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

  // If workspace is not provided but user needs to be associated with one, create one
  if (!overrides.currentWorkspaceId && !overrides.workspaceId) {
    const workspace = await buildWorkspace();
    overrides.currentWorkspaceId = workspace.id;
  }

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

export async function buildDocumentPermission(overrides: any = {}) {
  const prisma = getTestPrisma();
  if (!overrides.docId) {
    const doc = await buildDocument();
    overrides.docId = doc.id;
  }
  if (!overrides.userId && !overrides.guestCollaboratorId) {
    const user = await buildUser();
    overrides.userId = user.id;
  }
  if (!overrides.createdById) {
    overrides.createdById = overrides.userId;
  }

  // If guestCollaboratorId is provided, ensure it exists
  if (overrides.guestCollaboratorId) {
    const guestExists = await prisma.guestCollaborator.findUnique({
      where: { id: overrides.guestCollaboratorId },
      select: { id: true },
    });
    if (!guestExists) {
      throw new Error(`Guest collaborator with id ${overrides.guestCollaboratorId} does not exist`);
    }
  }

  // If inheritedFromId is provided, ensure the permission exists
  if (overrides.inheritedFromId) {
    const inheritedPermissionExists = await prisma.documentPermission.findUnique({
      where: { id: overrides.inheritedFromId },
      select: { id: true },
    });
    if (!inheritedPermissionExists) {
      throw new Error(`Inherited permission with id ${overrides.inheritedFromId} does not exist`);
    }
  }

  // If sourceGroupId is provided, ensure the group exists
  if (overrides.sourceGroupId) {
    const groupExists = await prisma.memberGroup.findUnique({
      where: { id: overrides.sourceGroupId },
      select: { id: true },
    });
    if (!groupExists) {
      throw new Error(`Member group with id ${overrides.sourceGroupId} does not exist`);
    }
  }

  // Set sourceGroupId to null for non-GROUP permissions if not explicitly provided
  if (overrides.sourceGroupId === undefined && overrides.inheritedFromType !== "GROUP") {
    overrides.sourceGroupId = null;
  }

  return await prisma.documentPermission.create({
    data: {
      ...generateMockDocumentPermission(),
      ...overrides,
    },
  });
}

export async function buildSubspaceMember(overrides: any = {}) {
  const prisma = getTestPrisma();
  if (!overrides.subspaceId) {
    const subspace = await buildSubspace();
    overrides.subspaceId = subspace.id;
  }
  if (!overrides.userId) {
    const user = await buildUser();
    overrides.userId = user.id;
  }
  return await prisma.subspaceMember.create({
    data: {
      ...generateMockSubspaceMember(),
      ...overrides,
    },
  });
}

export async function buildMemberGroup(overrides: any = {}) {
  const prisma = getTestPrisma();
  if (!overrides.workspaceId) {
    const workspace = await buildWorkspace();
    overrides.workspaceId = workspace.id;
  }
  return await prisma.memberGroup.create({
    data: {
      name: `Test Group ${Date.now()}`,
      description: "Test group description",
      ...overrides,
    },
  });
}

export async function buildMemberGroupUser(overrides: any = {}) {
  const prisma = getTestPrisma();
  if (!overrides.groupId) {
    const group = await buildMemberGroup();
    overrides.groupId = group.id;
  }
  if (!overrides.userId) {
    const user = await buildUser();
    overrides.userId = user.id;
  }
  return await prisma.memberGroupUser.create({
    data: overrides,
  });
}
