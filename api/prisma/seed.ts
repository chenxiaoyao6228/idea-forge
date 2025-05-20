import { Doc, DocVisibility, PrismaClient, SubspaceRole } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding...');
  console.time(`🌱 Database has been seeded`);

  const passwordHash = await hash('Aa111111');
  const users: { id: number; email: string }[] = [];

  // Create users
  for (let i = 1; i <= 10; i++) {
    const email = `${i}@qq.com`;
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (!existingUser) {
        const user = await prisma.user.create({
          data: {
            email,
            displayName: `User ${i}`,
            password: {
              create: {
                hash: passwordHash,
              },
            },
            status: 'ACTIVE',
          },
        });
        users.push(user);

        // Create default workspace
        const workspace = await prisma.workspace.create({
          data: {
            name: `${user.displayName}'s Workspace`,
            description: 'default workspace for user',
            members: {
              create: {
                userId: user.id,
                role: 'OWNER',
              },
            },
          },
        });

      
        // Create a default WORKSPACE_WIDE subspace
        const workspaceWideSubspace = await prisma.subspace.create({
          data: {
            name: 'WORKSPACE_WIDE',
            description: 'WORKSPACE_WIDE',
            workspaceId: workspace.id,
            members: {
              create: {
                userId: user.id,
                role: SubspaceRole.ADMIN,
              },
            },
          },
        });

        // Create some docs for default subspace
        for (let j = 0; j < 5; j++) {
          await prisma.doc.create({
            data: {
              title: `Document ${j} for ${email}`,
              content: `Content for document ${j}`,
              authorId: user.id,
              workspaceId: workspace.id,
              subspaceId: workspaceWideSubspace.id,
              visibility: DocVisibility.WORKSPACE,
            }
          })
        }


        // Create document structure for each user
        for (let folderIndex = 0; folderIndex < 5; folderIndex++) {
          let parentId: string | null = null;
          for (let level = 0; level < 4; level++) {
            const document = await prisma.doc.create({
              data: {
                title: `Document ${folderIndex}-${level} for ${email}`,
                content: `Content for document ${folderIndex}-${level}`,
                authorId: user.id,
                parentId,
                workspaceId: workspace.id,
                visibility: DocVisibility.PRIVATE
              },
            }) as Doc;
            parentId = document.id;

            if(i > 3) {
              continue;
            }

            // Create shares for first level documents
            if (level === 0 && folderIndex === 0) {
              // Share with other users (except document owner)
              for (const otherUser of users) {
                if (otherUser.id !== user.id) {
                  await prisma.docShare.create({
                    data: {
                      docId: document.id,
                      userId: otherUser.id,
                      authorId: user.id,
                      // Randomly assign permissions
                      permission: Math.random() > 0.5 ? 'EDIT' : 'READ',
                    },
                  });
                }
              }
            }
          }
        }
      } else {
        console.log(`User with email ${email} already exists.`);
      }
    } catch (error) {
      console.error(`Failed to create user or document for ${email}:`, error);
    }
  }

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