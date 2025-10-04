#!/usr/bin/env node

/*
# Create seed data: 4 users with team workspaces, subspaces, and document hierarchies
node scripts/seed/create-seed.js

# Show help
node scripts/seed/create-seed.js --help
*/

const { PrismaClient } = require('../../apps/api/node_modules/@prisma/client');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const DEFAULT_PASSWORD = 'Aa111111';

// Subspace types to create
const SUBSPACE_TYPES = [
  { type: 'WORKSPACE_WIDE', name: 'WorkspaceWide Subspace', description: 'All workspace members are automatically members' },
  { type: 'PUBLIC', name: 'Public Subspace', description: 'Any workspace member can join and leave freely' },
  { type: 'INVITE_ONLY', name: 'InviteOnly Subspace', description: 'Visible to all members but requires invitation to join' },
  { type: 'PRIVATE', name: 'Private Subspace', description: 'Only visible to invited members' },
  { type: 'PERSONAL', name: 'Personal Subspace', description: 'Only visible to the creator' },
];

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
  Creates 4 test users (user1@test.com to user4@test.com) with comprehensive workspace setup:
  - Each user gets a Team workspace named "User_X's Team"
  - Each workspace has 5 subspaces (one for each type: WORKSPACE_WIDE, PUBLIC, INVITE_ONLY, PRIVATE, PERSONAL)
  - Each subspace has a 3-level document hierarchy: parent -> child -> grandchild
  - Uses API endpoints for proper initialization
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
 * Login user to get cookies
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

    // Extract cookies from response headers
    const cookies = response.headers.get('set-cookie');
    if (!cookies) {
      throw new Error('No authentication cookies received from login');
    }

    return cookies;
  } catch (error) {
    console.error(`Failed to login user ${email}:`, error.message);
    throw error;
  }
}

/**
 * Create workspace via API endpoint
 */
async function createWorkspaceViaAPI(workspaceName, cookies) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        name: workspaceName,
        description: `Team workspace for ${workspaceName}`,
        avatar: '',
        type: 'TEAM',
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(`Workspace creation failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error(`Failed to create workspace "${workspaceName}":`, error.message);
    throw error;
  }
}

/**
 * Create subspace via API endpoint
 */
async function createSubspaceViaAPI(workspaceId, subspaceData, cookies) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/subspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify({
        ...subspaceData,
        workspaceId,
      }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(`Subspace creation failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error(`Failed to create subspace "${subspaceData.name}":`, error.message);
    throw error;
  }
}

/**
 * Create document via API endpoint
 */
async function createDocumentViaAPI(documentData, cookies) {
  try {
    // Remove undefined values from documentData to avoid validation errors
    const cleanedData = Object.fromEntries(
      Object.entries(documentData).filter(([_, value]) => value !== undefined)
    );

    const response = await fetch(`${API_BASE_URL}/api/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      body: JSON.stringify(cleanedData),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(`Document creation failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error(`Failed to create document "${documentData.title}":`, error.message);
    throw error;
  }
}

/**
 * Create document hierarchy (parent -> child -> grandchild) for a subspace
 */
async function createDocumentHierarchy(workspaceId, subspace, cookies) {
  const subspaceTypeName = subspace.name.toLowerCase().replace(/\s+/g, '-');

  // Create parent document (no parentId)
  const parent = await createDocumentViaAPI({
    title: `parent-in-${subspaceTypeName}`,
    workspaceId: workspaceId,
    subspaceId: subspace.id,
    type: 'NOTE',
    visibility: 'PRIVATE',
    content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
    // parentId intentionally omitted for top-level document
  }, cookies);
  console.log(`    ✅ Created parent document: "${parent.title}" (ID: ${parent.id})`);

  // Create child document
  const child = await createDocumentViaAPI({
    title: `child-in-${subspaceTypeName}`,
    workspaceId: workspaceId,
    subspaceId: subspace.id,
    parentId: parent.id,
    type: 'NOTE',
    visibility: 'PRIVATE',
    content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
  }, cookies);
  console.log(`    ✅ Created child document: "${child.title}" (ID: ${child.id})`);

  // Create grandchild document
  const grandchild = await createDocumentViaAPI({
    title: `grandchild-in-${subspaceTypeName}`,
    workspaceId: workspaceId,
    subspaceId: subspace.id,
    parentId: child.id,
    type: 'NOTE',
    visibility: 'PRIVATE',
    content: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] }),
  }, cookies);
  console.log(`    ✅ Created grandchild document: "${grandchild.title}" (ID: ${grandchild.id})`);

  return { parent, child, grandchild };
}

/**
 * Create user with workspace, subspaces, and document hierarchies
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

    // Step 3: Login to get cookies
    console.log(`Logging in user: ${email}`);
    const cookies = await loginUser(email, DEFAULT_PASSWORD);
    console.log(`✅ User logged in successfully`);

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

    let workspace;
    if (existingWorkspace) {
      console.log(`Workspace "${workspaceName}" already exists (ID: ${existingWorkspace.id})`);
      workspace = existingWorkspace;
    } else {
      // Step 5: Create workspace via API
      console.log(`Creating workspace: "${workspaceName}"`);
      workspace = await createWorkspaceViaAPI(workspaceName, cookies);
      console.log(`✅ Created workspace: "${workspaceName}" (ID: ${workspace.id})`);
    }

    // Step 6: Create all 5 subspace types
    console.log(`\nCreating subspaces for workspace "${workspaceName}"...`);
    const subspaces = [];

    for (const subspaceConfig of SUBSPACE_TYPES) {
      // Check if subspace already exists
      const existingSubspace = await prisma.subspace.findFirst({
        where: {
          workspaceId: workspace.id,
          name: subspaceConfig.name,
        },
      });

      let subspace;
      if (existingSubspace) {
        console.log(`  Subspace "${subspaceConfig.name}" already exists`);
        subspace = existingSubspace;
      } else {
        console.log(`  Creating ${subspaceConfig.type} subspace: "${subspaceConfig.name}"`);
        subspace = await createSubspaceViaAPI(workspace.id, {
          name: subspaceConfig.name,
          description: subspaceConfig.description,
          type: subspaceConfig.type,
        }, cookies);
        console.log(`  ✅ Created subspace: "${subspace.name}" (ID: ${subspace.id})`);
      }

      subspaces.push(subspace);

      // Step 7: Create document hierarchy for this subspace
      console.log(`  Creating document hierarchy in "${subspace.name}"...`);
      await createDocumentHierarchy(workspace.id, subspace, cookies);
    }

    return {
      user: { id: userId, email, displayName },
      workspace,
      subspaces,
      cookies,
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
    console.log('🚀 Starting comprehensive seed data creation...\n');
    console.log('This will create:');
    console.log('  - 4 users (user1@test.com to user4@test.com)');
    console.log('  - 4 team workspaces (one per user)');
    console.log('  - 5 subspaces per workspace (all types: WORKSPACE_WIDE, PUBLIC, INVITE_ONLY, PRIVATE, PERSONAL)');
    console.log('  - 3-level document hierarchy per subspace (parent -> child -> grandchild)');
    console.log('');

    // Parse command line arguments
    parseArguments();

    const results = [];

    // Create 4 users with their workspaces
    for (let i = 1; i <= 4; i++) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`👤 Creating User ${i} with full workspace setup...`);
      console.log('='.repeat(80));
      const result = await createUserWithWorkspace(i);
      results.push(result);
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('🎉 Seed data creation completed!');
    console.log('='.repeat(80));
    console.log('\n📊 Summary:');
    console.log('═'.repeat(80));

    results.forEach((result, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`  Email:      ${result.user.email}`);
      console.log(`  Password:   ${DEFAULT_PASSWORD}`);
      console.log(`  Workspace:  ${result.workspace.name} (ID: ${result.workspace.id})`);
      console.log(`  Subspaces:  ${result.subspaces.length} subspaces created`);
      result.subspaces.forEach(subspace => {
        console.log(`    - ${subspace.name} (${subspace.type})`);
      });
      console.log(`  Documents:  ${result.subspaces.length * 3} documents (3 per subspace)`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log('\n✨ All users, workspaces, subspaces, and document hierarchies created successfully!');
    console.log('\n🔑 Login credentials:');
    console.log('   Email: user1@test.com to user4@test.com');
    console.log(`   Password: ${DEFAULT_PASSWORD}`);
    console.log('');

  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    console.error(error.stack);
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
