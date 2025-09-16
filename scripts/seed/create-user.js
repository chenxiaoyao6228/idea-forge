#!/usr/bin/env node

/*
# Add 100 users to all workspaces
node scripts/seed/create-user.js

# Add 100 users to a specific workspace
node scripts/seed/create-user.js -n="York's Workspace"

# Show help
node scripts/seed/create-user.js --help
*/

const faker = require('faker');
const { PrismaClient } = require('../../apps/api/node_modules/@prisma/client');
const { hash } = require('argon2');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const USERS_PER_WORKSPACE = 30;
const DEFAULT_PASSWORD = 'Aa1111';
const CONCURRENT_LIMIT = 5; // Limit concurrent API calls

// Initialize Prisma client
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
  const options = {};
  
  for (const arg of args) {
    if (arg.startsWith('-n=')) {
      options.workspaceName = arg.substring(3).replace(/"/g, '');
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node create-user.js [options]

Options:
  -n="workspace name"    Add users to specific workspace by name
  --help, -h            Show this help message

Examples:
  node create-user.js                           # Add users to all workspaces
  node create-user.js -n="York's Workspace"    # Add users to specific workspace
      `);
      process.exit(0);
    }
  }
  
  return options;
}

/**
 * Get target workspaces based on command line arguments
 */
async function getTargetWorkspaces(workspaceName) {
  try {
    let workspaces;
    
    if (workspaceName) {
      workspaces = await prisma.workspace.findMany({
        where: {
          name: {
            contains: workspaceName,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
          name: true,
        },
      });
      
      if (workspaces.length === 0) {
        throw new Error(`No workspace found with name containing: "${workspaceName}"`);
      }
      
      console.log(`Found ${workspaces.length} workspace(s) matching "${workspaceName}"`);
    } else {
      workspaces = await prisma.workspace.findMany({
        select: {
          id: true,
          name: true,
        },
      });
      
      if (workspaces.length === 0) {
        throw new Error('No workspaces found in database');
      }
      
      console.log(`Found ${workspaces.length} workspace(s) in database`);
    }
    
    return workspaces;
  } catch (error) {
    console.error('Error fetching workspaces:', error.message);
    throw error;
  }
}

/**
 * Generate user data using faker.js
 */
function generateUserData(count) {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const firstName = faker.name.firstName().toLowerCase();
    const email = `${firstName}@test.com`;
    
    users.push({
      email,
      password: DEFAULT_PASSWORD,
      displayName: faker.name.findName(),
    });
  }
  
  return users;
}

/**
 * Register user via API endpoint
 */
async function registerUserViaAPI(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userData.email,
        password: userData.password,
      }),
    });
    
    const result = await response.json();
    // console.log(`Registration result for ${userData.email}:`, JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      throw new Error(`API registration failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
    }
    
    // Check if the response indicates an error
    if (result.code && result.code !== 'success') {
      throw new Error(`Registration failed with code: ${result.code} - ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to register user ${userData.email}:`, error.message);
    throw error;
  }
}

/**
 * Activate user by updating status to ACTIVE (bypass email verification)
 */
async function activateUser(userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required for activation');
    }
    
    // console.log(`Activating user with ID: ${userId}`);
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        emailVerified: new Date(),
      },
    });
    
    // console.log(`Successfully activated user: ${userId}`);
  } catch (error) {
    console.error(`Failed to activate user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Add user to workspace via API endpoint or fallback to database
 */
async function addUserToWorkspace(userId, workspaceId, adminToken) {
  try {
    // Try API first if we have a token
    if (adminToken) {
      const response = await fetch(`${API_BASE_URL}/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          userId: userId,
          role: 'MEMBER',
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`Successfully added user ${userId} to workspace ${workspaceId} via API`);
        return result;
      } else {
        console.log(`API failed (${response.status}), falling back to database approach`);
      }
    }
    
    // Fallback to database approach using workspace service logic
    // console.log(`Adding user ${userId} to workspace ${workspaceId} via database`);
    
    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    
    if (existingMember) {
      console.log(`User ${userId} is already a member of workspace ${workspaceId}`);
      return existingMember;
    }
    
    // Create workspace membership
    const member = await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId,
        role: 'MEMBER',
      },
    });
    
    // Assign workspace permissions
    await prisma.unifiedPermission.create({
      data: {
        userId,
        resourceType: 'WORKSPACE',
        resourceId: workspaceId,
        permission: 'READ', // Use READ permission for workspace members
        sourceType: 'WORKSPACE_MEMBER',
        priority: 6,
        createdById: userId, // Use the user themselves as creator for simplicity
      },
    });
    
    // Add to workspace-wide subspaces
    const workspaceWideSubspaces = await prisma.subspace.findMany({
      where: { 
        workspaceId, 
        type: 'WORKSPACE_WIDE' 
      },
    });
    
    for (const subspace of workspaceWideSubspaces) {
      await prisma.subspaceMember.create({
        data: {
          subspaceId: subspace.id,
          userId,
          role: 'MEMBER',
        },
      });
      
      // Assign subspace permissions
      await prisma.unifiedPermission.create({
        data: {
          userId,
          resourceType: 'SUBSPACE',
          resourceId: subspace.id,
          permission: 'READ', // Use READ permission for subspace members
          sourceType: 'SUBSPACE_MEMBER',
          priority: 4,
          createdById: userId,
        },
      });
    }
    
    // Create personal subspace for the user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const personalSubspace = await prisma.subspace.create({
      data: {
        name: `${user?.displayName || 'User'}'s Personal Space`,
        type: 'PERSONAL',
        workspaceId,
        allowPublicSharing: false,
        allowGuestCollaborators: false,
        allowExport: true,
        allowMemberInvites: false,
        allowTopLevelEdit: true,
        memberInvitePermission: 'ADMINS_ONLY',
        topLevelEditPermission: 'ADMINS_ONLY',
        subspaceAdminPermission: 'OWNER',
        subspaceMemberPermission: 'OWNER',
        nonSubspaceMemberPermission: 'NONE',
      },
    });
    
    // Add user as admin of their personal subspace
    await prisma.subspaceMember.create({
      data: {
        subspaceId: personalSubspace.id,
        userId,
        role: 'ADMIN',
      },
    });
    
    // Assign personal subspace permissions
    await prisma.unifiedPermission.create({
      data: {
        userId,
        resourceType: 'SUBSPACE',
        resourceId: personalSubspace.id,
        permission: 'OWNER',
        sourceType: 'SUBSPACE_ADMIN',
        priority: 3,
        createdById: userId,
      },
    });
    
    // console.log(`Successfully added user ${userId} to workspace ${workspaceId} via database`);
    return member;
  } catch (error) {
    console.error(`Failed to add user ${userId} to workspace ${workspaceId}:`, error.message);
    throw error;
  }
}

/**
 * Process users in batches with concurrency control
 */
async function processUsersInBatches(users, workspaceId, adminToken, batchSize = CONCURRENT_LIMIT) {
  const results = [];
  
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)} (${batch.length} users)`);
    
    const batchPromises = batch.map(async (userData) => {
      try {
        let userId;
        
        try {
          // Try to register user via API
          const registrationResult = await registerUserViaAPI(userData);
          userId = registrationResult.data?.id;
          
          if (!userId) {
            throw new Error(`No user ID returned from registration for ${userData.email}. Response: ${JSON.stringify(registrationResult)}`);
          }
        } catch (registrationError) {
          // If registration fails due to user already exists, try to get the existing user
          if (registrationError.message.includes('user_already_exists')) {
            console.log(`User ${userData.email} already exists, getting existing user ID`);
            const existingUser = await prisma.user.findUnique({
              where: { email: userData.email },
              select: { id: true, status: true },
            });
            
            if (!existingUser) {
              throw new Error(`User ${userData.email} should exist but not found in database`);
            }
            
            userId = existingUser.id;
            // console.log(`Found existing user ${userData.email} with ID: ${userId}`);
          } else {
            throw registrationError;
          }
        }
        
        // Activate user (bypass email verification)
        await activateUser(userId);
        
        // Add user to workspace via API or database fallback
        await addUserToWorkspace(userId, workspaceId, adminToken);
        
        console.log(`✅ Successfully created and added user: ${userData.email}`);
        return { success: true, email: userData.email, userId };
      } catch (error) {
        console.error(`❌ Failed to process user ${userData.email}:`, error.message);
        return { success: false, email: userData.email, error: error.message };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to avoid overwhelming the API
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Get a workspace admin user ID and optionally generate token for API authentication
 */
async function getWorkspaceAdmin(workspaceId) {
  const admin = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      role: { in: ['OWNER', 'ADMIN'] },
    },
    include: {
      user: true,
    },
  });
  
  if (!admin) {
    throw new Error(`No admin found for workspace ${workspaceId}`);
  }
  
  // Try to generate a token for the admin user, but don't fail if it doesn't work
  let adminToken = null;
  try {
    adminToken = await generateAdminToken(admin.userId);
    // console.log(`Generated admin token for user ${admin.userId}`);
  } catch (tokenError) {
    console.log(`Could not generate admin token: ${tokenError.message}. Will use database fallback.`);
  }
  
  return {
    userId: admin.userId,
    token: adminToken,
  };
}

/**
 * Generate a token for admin user to make API calls
 * This is a simplified approach - in production you might want to use proper JWT generation
 */
async function generateAdminToken(userId) {
  try {
    // For now, we'll use a simple approach by logging in the admin user
    // In a real scenario, you might want to generate a service token or use a different approach
    
    // Get admin user's email to login
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    
    if (!adminUser) {
      throw new Error(`Admin user ${userId} not found`);
    }
    
    // Try to login the admin user to get a token
    // First try with the default password
    let loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminUser.email,
        password: 'Aa1111', // Try default password first
      }),
    });
    
    if (!loginResponse.ok) {
      // If default password fails, try to get the actual password from database
      const adminWithPassword = await prisma.user.findUnique({
        where: { id: userId },
        include: { password: true },
      });
      
      if (!adminWithPassword?.password) {
        throw new Error(`Admin user ${userId} has no password set. Cannot generate token.`);
      }
      
      // For now, we'll skip token generation if we can't login
      // In a real scenario, you might want to create a service token or use a different approach
      throw new Error(`Cannot login admin user ${adminUser.email}. Please ensure the admin user has a password set.`);
    }
    
    const loginResult = await loginResponse.json();
    return loginResult.accessToken;
  } catch (error) {
    console.error(`Failed to generate admin token for user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting user creation script...\n');
    
    // Parse command line arguments
    const options = parseArguments();
    console.log(`Options:`, options);
    
    // Get target workspaces
    const workspaces = await getTargetWorkspaces(options.workspaceName);
    
    // Generate user data
    console.log(`\n📝 Generating ${USERS_PER_WORKSPACE} users per workspace...`);
    const userData = generateUserData(USERS_PER_WORKSPACE);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    // Process each workspace
    for (const workspace of workspaces) {
      console.log(`\n🏢 Processing workspace: "${workspace.name}" (${workspace.id})`);
      
      try {
        // Get workspace admin and generate token for API authentication
        const adminInfo = await getWorkspaceAdmin(workspace.id);
        console.log(`Using admin ID: ${adminInfo.userId} for API authentication`);
        
        // Process users for this workspace
        const results = await processUsersInBatches(userData, workspace.id, adminInfo.token);
        
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        
        totalSuccess += successCount;
        totalFailed += failedCount;
        
        console.log(`\n📊 Workspace "${workspace.name}" results:`);
        console.log(`  ✅ Success: ${successCount}`);
        console.log(`  ❌ Failed: ${failedCount}`);
        
        if (failedCount > 0) {
          console.log(`\n❌ Failed users:`);
          results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.email}: ${r.error}`);
          });
        }
        
      } catch (error) {
        console.error(`❌ Failed to process workspace "${workspace.name}":`, error.message);
        totalFailed += USERS_PER_WORKSPACE;
      }
    }
    
    console.log(`\n🎉 Script completed!`);
    console.log(`📊 Overall results:`);
    console.log(`  ✅ Total success: ${totalSuccess}`);
    console.log(`  ❌ Total failed: ${totalFailed}`);
    console.log(`  📈 Success rate: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%`);
    
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
  parseArguments,
  getTargetWorkspaces,
  generateUserData,
  registerUserViaAPI,
  activateUser,
  addUserToWorkspace,
  processUsersInBatches,
  getWorkspaceAdmin,
  generateAdminToken,
  main,
};
