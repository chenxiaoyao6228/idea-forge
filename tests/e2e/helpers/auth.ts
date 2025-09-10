import { getPrisma } from "./database";

export interface TestUser {
  email: string;
  password: string;
  displayName?: string;
  verified?: boolean;
}


/**
 * Create a verified test user for login testing using API-first approach
 * Returns user data that can be used for login tests
 */
export async function createVerifiedTestUser(
  email: string, 
  password: string = 'password123'
): Promise<TestUser> {
  try {
    // Try API-first approach: Register user via API
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (registerResponse.ok) {
      await registerResponse.json();
      console.log(`Created user via API: ${email}`);
      
      // Verify the user's email via database (no API endpoint for this)
      await verifyUserEmail(email);
      
      return {
        email,
        password,
        displayName: 'Test User',
        verified: true,
      };
    } else {
      throw new Error(`API registration failed: ${registerResponse.status} ${registerResponse.statusText}`);
    }
  } catch (error) {
    console.warn('API user creation failed, falling back to database:', error);

    throw error
  }
}

/**
 * Create a test user with specific status for error testing scenarios
 * This uses database fallback since we need to create users in invalid states
 */
export async function createTestUserWithStatus(
  email: string,
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'ARCHIVED',
  password?: string
): Promise<TestUser> {
  console.log(`Creating test user with status ${status} via database (API cannot create invalid states)`);
  
  const prisma = await getPrisma();
  
  try {
    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      await prisma.user.delete({
        where: { email },
      });
      console.log(`Deleted existing user: ${email}`);
    }
    
    // Create user with specific status
    const user = await prisma.user.create({
      data: {
        email,
        displayName: 'Test User',
        status,
        ...(password && {
          password: {
            create: {
              hash: password,
            },
          },
        }),
      },
    });
    
    console.log(`Created user with status ${status}: ${email}`);
    
    return {
      email,
      password: password || '',
      displayName: 'Test User',
      verified: status === 'ACTIVE',
    };
  } catch (error) {
    console.error(`Failed to create user with status ${status}:`, error);
    throw error;
  }
}

/**
 * Clean up test user data using API-first approach
 * Note: There's no API endpoint for user deletion, so we fall back to database
 */
export async function cleanupTestUser(email: string): Promise<void> {
  // Fallback to database cleanup
  const prisma = await getPrisma();
  
  try {
    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      // Delete related records first to avoid foreign key constraint violations
      await prisma.$transaction(async (tx) => {
        // Delete workspace memberships
        await tx.workspaceMember.deleteMany({
          where: { userId: existingUser.id },
        });
        
        // Delete subspace memberships
        await tx.subspaceMember.deleteMany({
          where: { userId: existingUser.id },
        });
        
        // Delete group memberships
        await tx.memberGroupUser.deleteMany({
          where: { userId: existingUser.id },
        });
        
        // Delete unified permissions
        await tx.unifiedPermission.deleteMany({
          where: { userId: existingUser.id },
        });
        
        // Delete guest invitations sent by this user
        await tx.guestCollaborator.deleteMany({
          where: { invitedById: existingUser.id },
        });
        
        // Delete user login history
        await tx.userLoginHistory.deleteMany({
          where: { userId: existingUser.id },
        });
        
        // Delete stars
        await tx.star.deleteMany({
          where: { userId: existingUser.id },
        });
        
        // Delete AI token usage
        await tx.aITokenUsage.deleteMany({
          where: { userId: existingUser.id },
        });
        
        // Delete files
        await tx.file.deleteMany({
          where: { userId: existingUser.id },
        });
        
        // Delete doc revisions
        await tx.docRevision.deleteMany({
          where: { authorId: existingUser.id },
        });
        
        // Delete doc shares
        await tx.docShare.deleteMany({
          where: { 
            OR: [
              { authorId: existingUser.id },
              { userId: existingUser.id },
            ],
          },
        });
        
        // Delete connections (OAuth)
        await tx.connection.deleteMany({
          where: { userId: existingUser.id },
        });
        
        // Finally, delete the user (this will cascade delete password due to onDelete: Cascade)
        await tx.user.delete({
          where: { id: existingUser.id },
        });
      });
      
      console.log(`Cleaned up test user: ${email}`);
    } else {
      console.log(`Test user ${email} does not exist, skipping cleanup`);
    }
  } catch (dbError) {
    console.warn(`Failed to cleanup test user ${email}:`, dbError);
  }
}



// Helper function to verify a user's email (bypass email verification)
async function verifyUserEmail(email: string) {
  const prisma = await getPrisma();
  
  // First check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
  });
  
  if (!user) {
    throw new Error(`User with email ${email} not found`);
  }
  
  await prisma.user.update({
    where: { email },
    data: {
      emailVerified: new Date(),
      status: 'ACTIVE',
    },
  });
}
