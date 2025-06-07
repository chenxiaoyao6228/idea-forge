// npx ts-node prisma/add-user-to-workspace.ts 2@qq.com cmbf3eh3a00001kplfee9ctxe
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addUserToWorkspace(userEmail: string, workspaceId: string) {
  console.log(`🌱 Adding user ${userEmail} to workspace ${workspaceId}...`);
  console.time(`🌱 Operation completed`);


  try {
    // 1. Find the user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      throw new Error(`User with email ${userEmail} not found`);
    }

    // 2. Find the workspace
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new Error(`Workspace with id ${workspaceId} not found`);
    }

    // 3. Check if user is already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      console.log(`User ${userEmail} is already a member of workspace ${workspaceId}`);
      return;
    }

    // 4. Add user to workspace
    const workspaceMember = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: user.id,
        role: 'MEMBER', // Default role
      },
    });

    console.log(`Successfully added user ${userEmail} to workspace ${workspaceId}`);
    console.log('Workspace member details:', workspaceMember);

    // 5. Add user to workspace-wide and public subspaces
    const subspaces = await prisma.subspace.findMany({
      where: {
        workspaceId,
        type: {
          in: ['WORKSPACE_WIDE', 'PUBLIC']
        },
      },
    });

    // Create a welcome document for the new user
    // const welcomeDoc = await prisma.doc.create({
    //   data: {
    //     title: `Welcome ${user.displayName || user.email}`,
    //     content: 'Welcome to the workspace!',
    //     authorId: user.id,
    //     createdById: user.id,
    //     lastModifiedById: user.id,
    //     workspaceId,
    //     visibility: 'PRIVATE'
    //   }
    // });

    for (const subspace of subspaces) {
      const existingSubspaceMember = await prisma.subspaceMember.findUnique({
        where: {
          subspaceId_userId: {
            subspaceId: subspace.id,
            userId: user.id,
          },
        },
      });

      if (!existingSubspaceMember) {
        const subspaceMember = await prisma.subspaceMember.create({
          data: {
            subspaceId: subspace.id,
            userId: user.id,
            role: 'MEMBER',
          },
        });
        console.log(`Added user to ${subspace.type} subspace:`, subspaceMember);
      } else {
        console.log(`User already exists in ${subspace.type} subspace`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    console.timeEnd(`🌱 Operation completed`);
    await prisma.$disconnect();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: ts-node add-user-to-workspace.ts <userEmail> <workspaceId>');
  process.exit(1);
}

const [userEmail, workspaceId] = args;

// Run the script
addUserToWorkspace(userEmail, workspaceId)
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 