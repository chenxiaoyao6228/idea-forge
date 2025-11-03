import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { GroupService } from "./group.service";
import { ShareDocumentService } from "@/document/share-document.services";
import { DocPermissionResolveService } from "@/permission/document-permission.service";
import { PrismaService } from "@/_shared/database/prisma/prisma.service";
import { getTestPrisma, clearDatabase, startContainersAndWriteEnv, stopContainers } from "@test/setup/test-container-setup";
import {
  buildDocument,
  buildUser,
  buildWorkspace,
  buildWorkspaceMember,
  buildSubspace,
  buildMemberGroup,
  buildMemberGroupUser,
} from "@test/factories/prisma";
import { PermissionLevel, PermissionInheritanceType } from "@idea/contracts";
import { EventPublisherService } from "@/_shared/events/event-publisher.service";

describe("GroupService - GROUP Permission Cleanup", () => {
  let groupService: GroupService;
  let shareService: ShareDocumentService;
  let prisma: any;
  let module: TestingModule;

  beforeAll(async () => {
    await startContainersAndWriteEnv();
    prisma = getTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        GroupService,
        ShareDocumentService,
        DocPermissionResolveService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventPublisherService, useValue: { publishWebsocketEvent: vi.fn() } },
      ],
    }).compile();

    groupService = module.get<GroupService>(GroupService);
    shareService = module.get<ShareDocumentService>(ShareDocumentService);
  });

  afterAll(async () => {
    await stopContainers();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it("should delete all GROUP permissions when user is removed from group", async () => {
    // Setup: Create workspace, users, group, and documents
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });

    const subspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Test Subspace",
      type: "PUBLIC",
    });

    // Create group and add userA
    const group = await buildMemberGroup({
      workspaceId: workspace.id,
      name: "Marketing Team",
    });

    await buildMemberGroupUser({
      groupId: group.id,
      userId: userA.id,
    });

    // Create documents
    const doc1 = await buildDocument({
      title: "Document 1",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    const doc2 = await buildDocument({
      title: "Document 2",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Share documents with group (this creates GROUP permissions for userA)
    await shareService.shareDocument(owner.id, doc1.id, {
      workspaceId: workspace.id,
      targetGroupIds: [group.id],
      permission: PermissionLevel.EDIT,
    });

    await shareService.shareDocument(owner.id, doc2.id, {
      workspaceId: workspace.id,
      targetGroupIds: [group.id],
      permission: PermissionLevel.READ,
    });

    // Verify userA has GROUP permissions before removal
    const permissionsBefore = await prisma.documentPermission.findMany({
      where: {
        userId: userA.id,
        inheritedFromType: PermissionInheritanceType.GROUP,
      },
    });

    expect(permissionsBefore.length).toBe(2); // Should have GROUP permissions on both docs

    // Remove userA from group
    await groupService.removeUserFromGroup(owner.id, {
      id: group.id,
      userId: userA.id,
    });

    // Verify userA has NO GROUP permissions after removal
    const permissionsAfter = await prisma.documentPermission.findMany({
      where: {
        userId: userA.id,
        inheritedFromType: PermissionInheritanceType.GROUP,
      },
    });

    expect(permissionsAfter.length).toBe(0); // All GROUP permissions should be deleted

    // Verify userA is no longer in group
    const membership = await prisma.memberGroupUser.findUnique({
      where: {
        groupId_userId: {
          groupId: group.id,
          userId: userA.id,
        },
      },
    });

    expect(membership).toBeNull();
  });

  it("should delete all GROUP permissions for all members when group is deleted", async () => {
    // Setup
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });
    const userB = await buildUser({ email: "userB@test.com" });
    const userC = await buildUser({ email: "userC@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: userB.id, role: "MEMBER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: userC.id, role: "MEMBER" });

    const subspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Test Subspace",
      type: "PUBLIC",
    });

    // Create group with multiple members
    const group = await buildMemberGroup({
      workspaceId: workspace.id,
      name: "Engineering Team",
    });

    await buildMemberGroupUser({ groupId: group.id, userId: userA.id });
    await buildMemberGroupUser({ groupId: group.id, userId: userB.id });
    await buildMemberGroupUser({ groupId: group.id, userId: userC.id });

    // Create documents
    const doc1 = await buildDocument({
      title: "Engineering Doc 1",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    const doc2 = await buildDocument({
      title: "Engineering Doc 2",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Share documents with group
    await shareService.shareDocument(owner.id, doc1.id, {
      workspaceId: workspace.id,
      targetGroupIds: [group.id],
      permission: PermissionLevel.MANAGE,
    });

    await shareService.shareDocument(owner.id, doc2.id, {
      workspaceId: workspace.id,
      targetGroupIds: [group.id],
      permission: PermissionLevel.EDIT,
    });

    // Verify all members have GROUP permissions before deletion
    const permissionsBefore = await prisma.documentPermission.findMany({
      where: {
        userId: { in: [userA.id, userB.id, userC.id] },
        inheritedFromType: PermissionInheritanceType.GROUP,
      },
    });

    expect(permissionsBefore.length).toBe(6); // 3 users × 2 docs = 6 permissions

    // Delete the group
    await groupService.deleteGroup(owner.id, { id: group.id });

    // Verify NO GROUP permissions remain for any member
    const permissionsAfter = await prisma.documentPermission.findMany({
      where: {
        userId: { in: [userA.id, userB.id, userC.id] },
        inheritedFromType: PermissionInheritanceType.GROUP,
      },
    });

    expect(permissionsAfter.length).toBe(0); // All GROUP permissions deleted

    // Verify group is deleted
    const deletedGroup = await prisma.memberGroup.findUnique({
      where: { id: group.id },
    });

    expect(deletedGroup).toBeNull();

    // Verify all memberships are deleted
    const memberships = await prisma.memberGroupUser.findMany({
      where: { groupId: group.id },
    });

    expect(memberships.length).toBe(0);
  });

  it("should not affect DIRECT permissions when removing user from group", async () => {
    // Setup
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });

    const subspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Test Subspace",
      type: "PUBLIC",
    });

    // Create group
    const group = await buildMemberGroup({
      workspaceId: workspace.id,
      name: "Test Group",
    });

    await buildMemberGroupUser({ groupId: group.id, userId: userA.id });

    // Create document
    const doc = await buildDocument({
      title: "Test Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Share with userA directly (DIRECT permission)
    await shareService.shareDocument(owner.id, doc.id, {
      workspaceId: workspace.id,
      targetUserIds: [userA.id],
      permission: PermissionLevel.MANAGE,
    });

    // Share with group (GROUP permission)
    await shareService.shareDocument(owner.id, doc.id, {
      workspaceId: workspace.id,
      targetGroupIds: [group.id],
      permission: PermissionLevel.READ,
    });

    // Verify userA has both DIRECT and GROUP permissions
    const permissionsBefore = await prisma.documentPermission.findMany({
      where: {
        userId: userA.id,
        docId: doc.id,
      },
    });

    expect(permissionsBefore.length).toBe(2);
    const directPerm = permissionsBefore.find((p) => p.inheritedFromType === PermissionInheritanceType.DIRECT);
    const groupPerm = permissionsBefore.find((p) => p.inheritedFromType === PermissionInheritanceType.GROUP);

    expect(directPerm).toBeDefined();
    expect(directPerm?.permission).toBe(PermissionLevel.MANAGE);
    expect(groupPerm).toBeDefined();
    expect(groupPerm?.permission).toBe(PermissionLevel.READ);

    // Remove userA from group
    await groupService.removeUserFromGroup(owner.id, {
      id: group.id,
      userId: userA.id,
    });

    // Verify only DIRECT permission remains
    const permissionsAfter = await prisma.documentPermission.findMany({
      where: {
        userId: userA.id,
        docId: doc.id,
      },
    });

    expect(permissionsAfter.length).toBe(1);
    expect(permissionsAfter[0].inheritedFromType).toBe(PermissionInheritanceType.DIRECT);
    expect(permissionsAfter[0].permission).toBe(PermissionLevel.MANAGE);
  });

  it("should handle user in multiple groups correctly when one group is deleted", async () => {
    // Setup
    const owner = await buildUser({ email: "owner@test.com" });
    const userA = await buildUser({ email: "userA@test.com" });

    const workspace = await buildWorkspace({ name: "Test Workspace" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: owner.id, role: "OWNER" });
    await buildWorkspaceMember({ workspaceId: workspace.id, userId: userA.id, role: "MEMBER" });

    const subspace = await buildSubspace({
      workspaceId: workspace.id,
      name: "Test Subspace",
      type: "PUBLIC",
    });

    // Create two groups, both with userA
    const group1 = await buildMemberGroup({
      workspaceId: workspace.id,
      name: "Group 1",
    });

    const group2 = await buildMemberGroup({
      workspaceId: workspace.id,
      name: "Group 2",
    });

    await buildMemberGroupUser({ groupId: group1.id, userId: userA.id });
    await buildMemberGroupUser({ groupId: group2.id, userId: userA.id });

    // Create document
    const doc = await buildDocument({
      title: "Shared Document",
      workspaceId: workspace.id,
      subspaceId: subspace.id,
      authorId: owner.id,
    });

    // Share with both groups (creates 2 GROUP permissions for userA)
    await shareService.shareDocument(owner.id, doc.id, {
      workspaceId: workspace.id,
      targetGroupIds: [group1.id],
      permission: PermissionLevel.EDIT,
    });

    await shareService.shareDocument(owner.id, doc.id, {
      workspaceId: workspace.id,
      targetGroupIds: [group2.id],
      permission: PermissionLevel.READ,
    });

    // Verify userA has 2 GROUP permissions (one from each group)
    const permissionsBefore = await prisma.documentPermission.findMany({
      where: {
        userId: userA.id,
        docId: doc.id,
        inheritedFromType: PermissionInheritanceType.GROUP,
      },
    });

    expect(permissionsBefore.length).toBe(2); // Both groups create separate permissions
    const group1Perm = permissionsBefore.find((p) => p.sourceGroupId === group1.id);
    const group2Perm = permissionsBefore.find((p) => p.sourceGroupId === group2.id);
    expect(group1Perm?.permission).toBe(PermissionLevel.EDIT);
    expect(group2Perm?.permission).toBe(PermissionLevel.READ);

    // Delete group1 - should only delete GROUP permissions from group1
    await groupService.deleteGroup(owner.id, { id: group1.id });

    // Verify only group1 permissions are deleted, group2 permissions remain
    const permissionsAfter = await prisma.documentPermission.findMany({
      where: {
        userId: userA.id,
        docId: doc.id,
        inheritedFromType: PermissionInheritanceType.GROUP,
      },
    });

    expect(permissionsAfter.length).toBe(1); // Only group2 permission remains
    expect(permissionsAfter[0].sourceGroupId).toBe(group2.id);
    expect(permissionsAfter[0].permission).toBe(PermissionLevel.READ);

    // userA should still be in group2
    const group2Membership = await prisma.memberGroupUser.findUnique({
      where: {
        groupId_userId: {
          groupId: group2.id,
          userId: userA.id,
        },
      },
    });

    expect(group2Membership).toBeDefined();
  });
});
