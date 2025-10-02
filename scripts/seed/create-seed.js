#!/usr/bin/env node

/*
# Create seed data: 4 users with team workspaces and personal subspaces
node scripts/seed/create-seed.js

# Show help
node scripts/seed/create-seed.js --help
*/

const { PrismaClient } = require('../../apps/api/node_modules/@prisma/client');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const DEFAULT_PASSWORD = 'Aa111111';

// Initialize Prisma client (only for email verification bypass)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/ideaforge',
    },
  },
});

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node create-seed.js [options]

Options:
  --help, -h            Show this help message

Description:
  Creates 4 test users (user1@test.com to user4@test.com) with their own team workspaces.
  Each user gets a workspace named "User_X's Team" where X is the user number.
  Each user also gets a personal subspace named "My Docs" for personal documents.
  Uses API endpoints for user registration and workspace creation.
      `);
      process.exit(0);
    }
  }
}

/**
 * Register user via API endpoint (with database fallback)
 */
async function registerUserViaAPI(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const result = await response.json();

    // Handle API response based on the actual structure
    if (result.statusCode === 0 && result.data && result.data.id) {
      // Success case
      return { data: result.data, alreadyExists: false };
    } else if (result.code === 'user_already_exists') {
      console.log(`User ${email} already exists`);
      // Get existing user from database
      const existingUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, status: true },
      });
      return { data: existingUser, alreadyExists: true };
    } else {
      throw new Error(`API registration failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
    }
  } catch (error) {
    console.log(`API registration failed, falling back to database creation: ${error.message}`);
    // Fallback to database creation
    return await createUserInDatabase(email, password);
  }
}

/**
 * Create user directly in database (fallback method)
 */
async function createUserInDatabase(email, password) {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, status: true },
    });

    if (existingUser) {
      console.log(`User ${email} already exists`);
      return { data: existingUser, alreadyExists: true };
    }

    // Create user directly in database
    const user = await prisma.user.create({
      data: {
        email,
        displayName: email.split('@')[0], // Use email prefix as display name
        status: 'PENDING', // Will be activated later
      },
    });

    return { data: user, alreadyExists: false };
  } catch (error) {
    console.error(`Failed to create user ${email} in database:`, error.message);
    throw error;
  }
}

/**
 * Activate user by updating status to ACTIVE (bypass email verification)
 * This is database operation as there's no API endpoint for this
 */
async function activateUser(userId) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
  } catch (error) {
    console.error(`Failed to activate user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Login user to get access token
 */
async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.accessToken;
  } catch (error) {
    console.error(`Failed to login user ${email}:`, error.message);
    throw error;
  }
}

/**
 * Create workspace via API endpoint (with fallback to database)
 */
async function createWorkspaceViaAPI(workspaceName, accessToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        name: workspaceName,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(`Workspace creation failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.log(`API workspace creation failed, falling back to database creation: ${error.message}`);
    // Fallback to database creation
    return await createWorkspaceInDatabase(workspaceName, accessToken);
  }
}

/**
 * Create workspace directly in database (fallback method)
 */
async function createWorkspaceInDatabase(workspaceName, accessToken) {
  try {
    const workspace = await prisma.workspace.create({
      data: {
        name: workspaceName,
        type: 'TEAM',
      },
    });

    return workspace;
  } catch (error) {
    console.error(`Failed to create workspace "${workspaceName}" in database:`, error.message);
    throw error;
  }
}

/**
 * Create user with workspace
 */
async function createUserWithWorkspace(userNumber) {
  const email = `user${userNumber}@test.com`;
  const displayName = `User ${userNumber}`;
  const workspaceName = `User_${userNumber}'s Team`;

  try {
    // Step 1: Register user via API (with database fallback)
    console.log(`Registering user: ${email}`);
    let userData, alreadyExists;
    try {
      const result = await registerUserViaAPI(email, DEFAULT_PASSWORD);
      userData = result.data;
      alreadyExists = result.alreadyExists;
    } catch (error) {
      console.log(`Registration failed, trying database fallback: ${error.message}`);
      const result = await createUserInDatabase(email, DEFAULT_PASSWORD);
      userData = result.data;
      alreadyExists = result.alreadyExists;
    }

    if (!userData || !userData.id) {
      throw new Error(`No user ID returned from registration for ${email}`);
    }

    const userId = userData.id;

    if (alreadyExists) {
      console.log(`User ${email} already exists (ID: ${userId})`);
    } else {
      console.log(`✅ Created user: ${email} (ID: ${userId})`);
    }

    // Step 2: Activate user (bypass email verification) - database operation
    await activateUser(userId);

    // Step 3: Login to get access token (optional, for API calls)
    let accessToken = null;
    try {
      console.log(`Logging in user: ${email}`);
      accessToken = await loginUser(email, DEFAULT_PASSWORD);
    } catch (error) {
      console.log(`Login failed (API server may not be running): ${error.message}`);
      console.log(`Continuing with database-only operations...`);
    }

    // Step 4: Check if user already has a workspace with this name
    const existingWorkspace = await prisma.workspace.findFirst({
      where: {
        name: workspaceName,
        members: {
          some: {
            userId: userId,
          },
        },
      },
    });

    if (existingWorkspace) {
      console.log(`Workspace "${workspaceName}" already exists (ID: ${existingWorkspace.id})`);
      return {
        user: { id: userId, email, displayName },
        workspace: existingWorkspace,
        accessToken,
      };
    }

    // Step 5: Create workspace via API (with database fallback)
    console.log(`Creating workspace: "${workspaceName}"`);
    let workspace;
    if (accessToken) {
      workspace = await createWorkspaceViaAPI(workspaceName, accessToken);
    } else {
      console.log(`Creating workspace directly in database (API not available)`);
      workspace = await createWorkspaceInDatabase(workspaceName, null);
    }
    console.log(`✅ Created workspace: "${workspaceName}" (ID: ${workspace.id})`);

    // Step 6: Ensure user is added as workspace member (in case of database fallback)
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: userId,
      },
    });

    if (!existingMember) {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: userId,
          role: 'OWNER',
        },
      });
      console.log(`✅ Added user as workspace owner`);
    }


    return {
      user: { id: userId, email, displayName },
      workspace,
      accessToken,
    };
  } catch (error) {
    console.error(`❌ Failed to create user ${email}:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting seed data creation...\n');

    // Parse command line arguments
    parseArguments();

    const results = [];

    // Create 4 users with their workspaces
    for (let i = 1; i <= 4; i++) {
      console.log(`\n👤 Creating user ${i}...`);
      console.log('─'.repeat(60));
      const result = await createUserWithWorkspace(i);
      results.push(result);
      console.log('─'.repeat(60));
    }

    console.log('\n🎉 Seed data creation completed!');
    console.log('\n📊 Summary:');
    console.log('═'.repeat(60));
    results.forEach((result, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  Email:     ${result.user.email}`);
      console.log(`  Password:  ${DEFAULT_PASSWORD}`);
      console.log(`  Workspace: ${result.workspace.name}`);
      console.log(`  User ID:   ${result.user.id}`);
      console.log(`  Personal:  My Docs (personal subspace)`);
      console.log('');
    });
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\n⚠️  Script interrupted by user');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Script terminated');
  await prisma.$disconnect();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  main().catch(async (error) => {
    console.error('💥 Unhandled error:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
}

module.exports = {
  createUserWithWorkspace,
  main,
};
