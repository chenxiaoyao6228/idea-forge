#!/usr/bin/env node

/*
# Create groups for all workspaces
node scripts/seed/create-group.js

# Create groups for a specific workspace
node scripts/seed/create-group.js -n="York's Team"

# Create custom groups for a specific workspace
node scripts/seed/create-group.js -n="York's Team" -g="Development Team,Marketing Team,Design Team"

# Create groups with custom member count
node scripts/seed/create-group.js -n="York's Team" -m=15

# Show help
node scripts/seed/create-group.js --help
*/

const { PrismaClient } = require('../../apps/api/node_modules/@prisma/client');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const DEFAULT_GROUPS = ['Development Team', 'Marketing Team', 'Design Team', 'QA Team', 'Product Team'];
const DEFAULT_MEMBERS_PER_GROUP = 10;
const CONCURRENT_LIMIT = 3; // Limit concurrent API calls

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
    } else if (arg.startsWith('-g=')) {
      options.groups = arg.substring(3).replace(/"/g, '').split(',').map(g => g.trim());
    } else if (arg.startsWith('-m=')) {
      options.membersPerGroup = parseInt(arg.substring(3));
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node create-group.js [options]

Options:
  -n="workspace name"    Create groups in specific workspace by name
  -g="group1,group2"     Custom group names (comma-separated)
  -m=number             Number of members per group (default: ${DEFAULT_MEMBERS_PER_GROUP})
  --help, -h            Show this help message

Examples:
  node create-group.js                                    # Create default groups in all workspaces
  node create-group.js -n="York's Workspace"             # Create default groups in specific workspace
  node create-group.js -n="York's Workspace" -g="Dev,QA" # Create custom groups
  node create-group.js -n="York's Workspace" -m=15       # Create groups with 15 members each
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
 * Get workspace members for group creation
 */
async function getWorkspaceMembers(workspaceId, limit = DEFAULT_MEMBERS_PER_GROUP) {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
      take: limit * 2, // Get more than needed to have options for random selection
    });
    
    if (members.length === 0) {
      throw new Error(`No members found in workspace ${workspaceId}`);
    }
    
    // Shuffle and take the requested number
    const shuffled = members.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(limit, members.length));
  } catch (error) {
    console.error(`Error fetching workspace members for ${workspaceId}:`, error.message);
    throw error;
  }
}

/**
 * Create group via API endpoint
 */
async function createGroupViaAPI(groupData, adminToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(groupData),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`API group creation failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
    }
    
    // Check if the response indicates an error
    if (result.code && result.code !== 'success') {
      throw new Error(`Group creation failed with code: ${result.code} - ${result.message}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to create group ${groupData.name}:`, error.message);
    throw error;
  }
}

/**
 * Add user to group via API endpoint
 */
async function addUserToGroupViaAPI(groupId, userId, adminToken) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/groups/${groupId}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        id: groupId,
        userId: userId,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`API add user to group failed: ${response.status} ${response.statusText} - ${JSON.stringify(result)}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to add user ${userId} to group ${groupId}:`, error.message);
    throw error;
  }
}

/**
 * Get a workspace admin user ID and generate token for API authentication
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
  
  // Try to generate a token for the admin user
  let adminToken = null;
  try {
    adminToken = await generateAdminToken(admin.userId);
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
 */
async function generateAdminToken(userId) {
  try {
    // Get admin user's email to login
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, status: true },
    });
    
    if (!adminUser) {
      throw new Error(`Admin user ${userId} not found`);
    }
    
    if (adminUser.status !== 'ACTIVE') {
      throw new Error(`Admin user ${adminUser.email} is not active (status: ${adminUser.status})`);
    }
    
    // Try to login the admin user to get a token
    const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: adminUser.email,
        password: 'Aa1111', // Try default password
      }),
    });
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`Cannot login admin user ${adminUser.email}. Status: ${loginResponse.status}, Response: ${errorText}`);
    }
    
    const loginResult = await loginResponse.json();
    
    if (!loginResult.accessToken) {
      throw new Error(`No access token in login response for ${adminUser.email}. Response: ${JSON.stringify(loginResult)}`);
    }
    
    return loginResult.accessToken;
  } catch (error) {
    console.error(`Failed to generate admin token for user ${userId}:`, error.message);
    throw error;
  }
}

/**
 * Create group via database (fallback when API fails)
 */
async function createGroupViaDatabase(groupData, adminUserId) {
  try {
    const group = await prisma.memberGroup.create({
      data: {
        name: groupData.name,
        description: groupData.description,
        workspaceId: groupData.workspaceId,
        members: {
          create: {
            userId: adminUserId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });
    
    return { data: group };
  } catch (error) {
    console.error(`Failed to create group ${groupData.name} via database:`, error.message);
    throw error;
  }
}

/**
 * Add user to group via database (fallback when API fails)
 */
async function addUserToGroupViaDatabase(groupId, userId) {
  try {
    // Check if user is already in the group
    const existingMember = await prisma.memberGroupUser.findFirst({
      where: {
        groupId,
        userId,
      },
    });
    
    if (existingMember) {
      console.log(`User ${userId} is already a member of group ${groupId}`);
      return { success: true };
    }
    
    await prisma.memberGroupUser.create({
      data: {
        groupId,
        userId,
      },
    });
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to add user ${userId} to group ${groupId} via database:`, error.message);
    throw error;
  }
}

/**
 * Process groups creation for a workspace
 */
async function processGroupsForWorkspace(workspace, groupNames, membersPerGroup, adminToken, adminUserId) {
  const results = [];
  
  console.log(`\n🏢 Processing workspace: "${workspace.name}" (${workspace.id})`);
  console.log(`Creating ${groupNames.length} groups with ${membersPerGroup} members each`);
  
  // Get workspace members
  const workspaceMembers = await getWorkspaceMembers(workspace.id, membersPerGroup * groupNames.length);
  console.log(`Found ${workspaceMembers.length} workspace members`);
  
  if (workspaceMembers.length < membersPerGroup) {
    console.log(`⚠️  Warning: Only ${workspaceMembers.length} members available, but ${membersPerGroup} requested per group`);
  }
  
  // Create groups
  for (let i = 0; i < groupNames.length; i++) {
    const groupName = groupNames[i];
    console.log(`\n📝 Creating group: "${groupName}"`);
    
    try {
      // Create group
      const groupData = {
        name: groupName,
        description: `Auto-generated group for testing: ${groupName}`,
        workspaceId: workspace.id,
      };
      
      let groupResult;
      let groupId;
      
      // Try API first, fallback to database
      if (adminToken) {
        try {
          groupResult = await createGroupViaAPI(groupData, adminToken);
          groupId = groupResult.data?.id;
          console.log(`✅ Group "${groupName}" created via API with ID: ${groupId}`);
        } catch (apiError) {
          console.log(`⚠️  API group creation failed, falling back to database: ${apiError.message}`);
          groupResult = await createGroupViaDatabase(groupData, adminUserId);
          groupId = groupResult.data?.id;
          console.log(`✅ Group "${groupName}" created via database with ID: ${groupId}`);
        }
      } else {
        groupResult = await createGroupViaDatabase(groupData, adminUserId);
        groupId = groupResult.data?.id;
        console.log(`✅ Group "${groupName}" created via database with ID: ${groupId}`);
      }
      
      if (!groupId) {
        throw new Error(`No group ID returned from creation. Response: ${JSON.stringify(groupResult)}`);
      }
      
      // Add members to group
      const startIndex = i * membersPerGroup;
      const endIndex = Math.min(startIndex + membersPerGroup, workspaceMembers.length);
      const groupMembers = workspaceMembers.slice(startIndex, endIndex);
      
      console.log(`👥 Adding ${groupMembers.length} members to group "${groupName}"`);
      
      for (const member of groupMembers) {
        try {
          // Try API first, fallback to database
          if (adminToken) {
            try {
              await addUserToGroupViaAPI(groupId, member.userId, adminToken);
              console.log(`  ✅ Added ${member.user.displayName || member.user.email} to group via API`);
            } catch (apiError) {
              console.log(`  ⚠️  API add user failed, using database: ${apiError.message}`);
              await addUserToGroupViaDatabase(groupId, member.userId);
              console.log(`  ✅ Added ${member.user.displayName || member.user.email} to group via database`);
            }
          } else {
            await addUserToGroupViaDatabase(groupId, member.userId);
            console.log(`  ✅ Added ${member.user.displayName || member.user.email} to group via database`);
          }
        } catch (error) {
          console.error(`  ❌ Failed to add ${member.user.displayName || member.user.email}:`, error.message);
        }
      }
      
      results.push({
        success: true,
        groupName,
        groupId,
        memberCount: groupMembers.length,
      });
      
    } catch (error) {
      console.error(`❌ Failed to create group "${groupName}":`, error.message);
      results.push({
        success: false,
        groupName,
        error: error.message,
      });
    }
    
    // Small delay between groups
    if (i < groupNames.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting group creation script...\n');
    
    // Parse command line arguments
    const options = parseArguments();
    console.log(`Options:`, options);
    
    // Get target workspaces
    const workspaces = await getTargetWorkspaces(options.workspaceName);
    
    // Determine group names
    const groupNames = options.groups || DEFAULT_GROUPS;
    const membersPerGroup = options.membersPerGroup || DEFAULT_MEMBERS_PER_GROUP;
    
    console.log(`\n📝 Group configuration:`);
    console.log(`  Groups: ${groupNames.join(', ')}`);
    console.log(`  Members per group: ${membersPerGroup}`);
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    // Process each workspace
    for (const workspace of workspaces) {
      try {
        // Get workspace admin and generate token for API authentication
        const adminInfo = await getWorkspaceAdmin(workspace.id);
        console.log(`Using admin ID: ${adminInfo.userId} for API authentication`);
        
        if (!adminInfo.token) {
          console.log(`⚠️  No admin token available, will use database fallback for workspace "${workspace.name}"`);
        }
        
        // Process groups for this workspace
        const results = await processGroupsForWorkspace(workspace, groupNames, membersPerGroup, adminInfo.token, adminInfo.userId);
        
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        
        totalSuccess += successCount;
        totalFailed += failedCount;
        
        console.log(`\n📊 Workspace "${workspace.name}" results:`);
        console.log(`  ✅ Success: ${successCount}`);
        console.log(`  ❌ Failed: ${failedCount}`);
        
        if (failedCount > 0) {
          console.log(`\n❌ Failed groups:`);
          results.filter(r => !r.success).forEach(r => {
            console.log(`  - ${r.groupName}: ${r.error}`);
          });
        }
        
        if (successCount > 0) {
          console.log(`\n✅ Created groups:`);
          results.filter(r => r.success).forEach(r => {
            console.log(`  - ${r.groupName} (${r.memberCount} members)`);
          });
        }
        
      } catch (error) {
        console.error(`❌ Failed to process workspace "${workspace.name}":`, error.message);
        totalFailed += groupNames.length;
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
  getWorkspaceMembers,
  createGroupViaAPI,
  addUserToGroupViaAPI,
  createGroupViaDatabase,
  addUserToGroupViaDatabase,
  getWorkspaceAdmin,
  generateAdminToken,
  processGroupsForWorkspace,
  main,
};
