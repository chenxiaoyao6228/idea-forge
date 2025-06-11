import {
  Doc,
  DocVisibility,
  PrismaClient,
  SubspaceRole,
  WorkspaceRole,
} from "@prisma/client";
import { hash } from "argon2";
import fractionalIndex from "fractional-index";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding...");
  console.time(`🌱 Database has been seeded`);

  const passwordHash = await hash("Aa111111");

  // Create users
  const user1 = await prisma.user.upsert({
    where: { email: "1@qq.com" },
    update: {},
    create: {
      email: "1@qq.com",
      displayName: "User 1",
      password: {
        create: {
          hash: passwordHash,
        },
      },
      status: "ACTIVE",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: "2@qq.com" },
    update: {},
    create: {
      email: "2@qq.com",
      displayName: "User 2",
      password: {
        create: {
          hash: passwordHash,
        },
      },
      status: "ACTIVE",
    },
  });

  // Create Test Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Test Workspace",
      description: "Workspace for testing permissions",
      members: {
        create: [
          {
            userId: user1.id,
            role: WorkspaceRole.OWNER,
          },
          {
            userId: user2.id,
            role: WorkspaceRole.MEMBER,
          },
        ],
      },
    },
  });

  // Create two subspaces with index
  const subspace1 = await prisma.subspace.create({
    data: {
      name: "Subspace 1",
      description: "First subspace for testing",
      workspaceId: workspace.id,
      index: fractionalIndex(null, null), // Add index for ordering
      members: {
        create: [
          {
            userId: user1.id,
            role: SubspaceRole.ADMIN,
          },
          {
            userId: user2.id,
            role: SubspaceRole.MEMBER,
          },
        ],
      },
    },
  });

  const subspace2 = await prisma.subspace.create({
    data: {
      name: "Subspace 2",
      description: "Second subspace for testing",
      workspaceId: workspace.id,
      index: fractionalIndex(subspace1.index, null), // Add index for ordering
      members: {
        create: [
          {
            userId: user1.id,
            role: SubspaceRole.ADMIN,
          },
          {
            userId: user2.id,
            role: SubspaceRole.MEMBER,
          },
        ],
      },
    },
  });

  // Create member groups
  const group1 = await prisma.memberGroup.create({
    data: {
      name: "Group 1",
      description: "Group for User 1",
      workspaceId: workspace.id,
      members: {
        create: {
          userId: user1.id,
        },
      },
    },
  });

  const group2 = await prisma.memberGroup.create({
    data: {
      name: "Group 2",
      description: "Group for User 2",
      workspaceId: workspace.id,
      members: {
        create: {
          userId: user2.id,
        },
      },
    },
  });

  // Create nested folder structure by user2
  // Level 1 folders
  const folderA1 = await prisma.doc.create({
    data: {
      title: "A1",
      content: "{}",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      position: 0,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  const folderA2 = await prisma.doc.create({
    data: {
      title: "A2",
      content: "{}",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      position: 1,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  // Level 2 folders
  const folderA11 = await prisma.doc.create({
    data: {
      title: "A11",
      content: "{}",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      parentId: folderA1.id,
      position: 0,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  const folderA12 = await prisma.doc.create({
    data: {
      title: "A12",
      content: "{}",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      parentId: folderA1.id,
      position: 1,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  const folderA21 = await prisma.doc.create({
    data: {
      title: "A21",
      content: "{}",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      parentId: folderA2.id,
      position: 0,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  // Level 3 documents
  const docA111 = await prisma.doc.create({
    data: {
      title: "A111",
      content: "Content for A111",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      parentId: folderA11.id,
      position: 0,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  const docA112 = await prisma.doc.create({
    data: {
      title: "A112",
      content: "Content for A112",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      parentId: folderA11.id,
      position: 1,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  const docA121 = await prisma.doc.create({
    data: {
      title: "A121",
      content: "Content for A121",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      parentId: folderA12.id,
      position: 0,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  const docA122 = await prisma.doc.create({
    data: {
      title: "A122",
      content: "Content for A122",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      parentId: folderA12.id,
      position: 1,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  const docA211 = await prisma.doc.create({
    data: {
      title: "A211",
      content: "Content for A211",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      parentId: folderA21.id,
      position: 0,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  const docA212 = await prisma.doc.create({
    data: {
      title: "A212",
      content: "Content for A212",
      authorId: user2.id,
      createdById: user2.id,
      lastModifiedById: user2.id,
      workspaceId: workspace.id,
      subspaceId: subspace1.id,
      visibility: DocVisibility.WORKSPACE,
      type: "NOTE",
      parentId: folderA21.id,
      position: 1,
      publishedAt: new Date(), // Add publishedAt
    },
  });

  // Create DocShare records for specific folders
  await prisma.docShare.createMany({
    data: [
      {
        docId: folderA1.id,
        authorId: user2.id,
        userId: user1.id,
        permission: "EDIT",
        includeChildDocuments: true,
        published: true,
        urlId: `share-${folderA1.id}`,
      },
      {
        docId: folderA2.id,
        authorId: user2.id,
        userId: user1.id,
        permission: "EDIT",
        includeChildDocuments: true,
        published: true,
        urlId: `share-${folderA2.id}`,
      },
      {
        docId: folderA11.id,
        authorId: user2.id,
        userId: user1.id,
        permission: "EDIT",
        includeChildDocuments: true,
        published: true,
        urlId: `share-${folderA11.id}`,
      },
    ],
  });

  // Create UnifiedPermission for groups
  await prisma.unifiedPermission.createMany({
    data: [
      {
        resourceType: "DOCUMENT",
        resourceId: folderA1.id,
        userId: user1.id,
        permission: "EDIT",
        sourceType: "GROUP",
        priority: 2,
        createdById: user2.id
      },
      {
        resourceType: "DOCUMENT",
        resourceId: folderA2.id,
        userId: user1.id,
        permission: "READ",
        sourceType: "GROUP",
        priority: 2,
        createdById: user2.id
      },
      {
        resourceType: "DOCUMENT",
        resourceId: folderA11.id,
        userId: user2.id,
        permission: "EDIT",
        sourceType: "GROUP",
        priority: 2,
        createdById: user2.id
      },
      {
        resourceType: "DOCUMENT",
        resourceId: docA111.id,
        userId: user1.id,
        permission: "MANAGE",
        sourceType: "GROUP",
        priority: 2,
        createdById: user2.id
      },
      {
        resourceType: "DOCUMENT",
        resourceId: docA112.id,
        userId: user2.id,
        permission: "EDIT",
        sourceType: "GROUP",
        priority: 2,
        createdById: user2.id
      }
    ]
  });

  // Update subspace navigation tree
  const navigationTree = [
    {
      id: folderA1.id,
      title: folderA1.title,
      type: "DOCUMENT",
      children: [
        {
          id: folderA11.id,
          title: folderA11.title,
          type: "DOCUMENT",
          children: [
            {
              id: docA111.id,
              title: docA111.title,
              type: "DOCUMENT",
              children: [],
            },
            {
              id: docA112.id,
              title: docA112.title,
              type: "DOCUMENT",
              children: [],
            },
          ],
        },
        {
          id: folderA12.id,
          title: folderA12.title,
          type: "DOCUMENT",
          children: [
            {
              id: docA121.id,
              title: docA121.title,
              type: "DOCUMENT",
              children: [],
            },
            {
              id: docA122.id,
              title: docA122.title,
              type: "DOCUMENT",
              children: [],
            },
          ],
        },
      ],
    },
    {
      id: folderA2.id,
      title: folderA2.title,
      type: "DOCUMENT",
      children: [
        {
          id: folderA21.id,
          title: folderA21.title,
          type: "DOCUMENT",
          children: [
            {
              id: docA211.id,
              title: docA211.title,
              type: "DOCUMENT",
              children: [],
            },
            {
              id: docA212.id,
              title: docA212.title,
              type: "DOCUMENT",
              children: [],
            },
          ],
        },
      ],
    },
  ];

  // Update subspace with navigation tree
  await prisma.subspace.update({
    where: { id: subspace1.id },
    data: {
      navigationTree: navigationTree,
    },
  });

  console.log("Created folder structure by user2:");
  console.log("- A1 (shared with user1)");
  console.log("  - A11 (shared with user1)");
  console.log("    - A111");
  console.log("    - A112");
  console.log("  - A12");
  console.log("    - A121");
  console.log("    - A122");
  console.log("- A2 (shared with user1)");
  console.log("  - A21");
  console.log("    - A211");
  console.log("    - A212");

  console.timeEnd(`🌱 Database has been seeded`);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
