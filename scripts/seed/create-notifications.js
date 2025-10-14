#!/usr/bin/env node

/*
# Seed 100+ notifications of all kinds for a specific user
node scripts/seed/create-notifications.js -e="user1@test.com"

# Show help
node scripts/seed/create-notifications.js --help
*/

const { PrismaClient } = require('../../apps/api/node_modules/@prisma/client/default');


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
    if (arg.startsWith('-e=')) {
      options.userEmail = arg.substring(3).replace(/"/g, '');
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node create-notifications.js [options]

Options:
  -e="user@example.com"    User email to generate notifications for (required)
  --help, -h               Show this help message

Description:
  Creates 100+ notifications of all kinds (PERMISSION_REQUEST, WORKSPACE_INVITATION,
  SUBSPACE_INVITATION, PERMISSION_GRANT, PERMISSION_REJECT) distributed across all
  workspaces the user belongs to. Uses direct database operations only.

Examples:
  node create-notifications.js -e="user@example.com"
      `);
      process.exit(0);
    }
  }

  if (!options.userEmail) {
    console.error('❌ Error: User email is required. Use -e="user@example.com"');
    console.log('Run with --help for more information');
    process.exit(1);
  }

  return options;
}


/**
 * Create notification via database
 */
async function createNotification(notificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: notificationData.userId,
        event: notificationData.event,
        workspaceId: notificationData.workspaceId,
        actorId: notificationData.actorId || null,
        documentId: notificationData.documentId || null,
        metadata: notificationData.metadata || {},
        actionRequired: notificationData.actionRequired || false,
        actionType: notificationData.actionType || null,
        actionStatus: notificationData.actionRequired ? 'PENDING' : 'APPROVED',
        actionPayload: notificationData.actionPayload || {},
      },
    });
    return notification;
  } catch (error) {
    console.error(`Failed to create notification:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting notification seeding script...\n');

    // Parse command line arguments
    const options = parseArguments();
    console.log(`User email: ${options.userEmail}\n`);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: options.userEmail },
    });

    if (!user) {
      throw new Error(`User with email ${options.userEmail} not found`);
    }

    console.log(`✅ Found user: ${user.displayName || user.email} (${user.id})`);

    // Get user's workspaces
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: { workspace: true },
    });

    if (workspaceMembers.length === 0) {
      throw new Error(`User ${options.userEmail} is not a member of any workspace`);
    }

    console.log(`✅ Found ${workspaceMembers.length} workspace(s)`);

    // Get multiple users to act as "actors"
    const allUsers = await prisma.user.findMany({
      where: { id: { not: user.id } },
      take: 10, // Get up to 10 other users for variety
    });

    if (allUsers.length === 0) {
      throw new Error('No other users found to act as notification actors');
    }

    console.log(`✅ Found ${allUsers.length} actor(s) for notifications\n`);

    // Get multiple documents from user's workspaces
    let documents = [];
    try {
      if (prisma.document) {
        documents = await prisma.document.findMany({
          where: {
            workspaceId: { in: workspaceMembers.map((wm) => wm.workspaceId) },
          },
          take: 20, // Get up to 20 documents for variety
        });
        console.log(`✅ Found ${documents.length} document(s) for notifications`);
      }
    } catch (err) {
      console.log(`⚠️  Could not query documents: ${err.message}`);
    }

    const createdNotifications = [];
    const notificationCounts = {
      PERMISSION_REQUEST: 0,
      WORKSPACE_INVITATION: 0,
      SUBSPACE_INVITATION: 0,
      PERMISSION_GRANT: 0,
      PERMISSION_REJECT: 0,
    };

    // Calculate notifications per workspace to reach ~100 total
    const notificationsPerWorkspace = Math.ceil(100 / workspaceMembers.length);
    const totalNotificationsTarget = 100;

    // Action required ratio: 1:3 (25% action-required, 75% informational)
    const ACTION_REQUIRED_PROBABILITY = 0.25;

    console.log(`📊 Creating approximately ${totalNotificationsTarget} notifications (${notificationsPerWorkspace} per workspace)`);
    console.log(`📊 Action-required ratio: 25% (1:3)\n`);

    // Helper function to get random actor
    const getRandomActor = () => allUsers[Math.floor(Math.random() * allUsers.length)];

    // Helper function to get random document
    const getRandomDocument = () => documents.length > 0 ? documents[Math.floor(Math.random() * documents.length)] : null;

    // Helper function to generate random message
    const getRandomMessage = (type) => {
      const messages = {
        PERMISSION_REQUEST: [
          'I would like to collaborate on this document!',
          'Can I help edit this document?',
          'Requesting permission to contribute to this project.',
          'I have some ideas for this document.',
        ],
        WORKSPACE_INVITATION: [
          'Join our team workspace!',
          'You should join this workspace!',
          'We need your expertise in this workspace.',
          'Come collaborate with us!',
        ],
        SUBSPACE_INVITATION: [
          'Join this subspace!',
          'Check out this subspace!',
          'You might find this subspace interesting.',
          'Come join our subspace community!',
        ],
      };
      const messageList = messages[type] || ['Check this out!'];
      return messageList[Math.floor(Math.random() * messageList.length)];
    };

    // Generate notifications for each workspace
    for (const workspaceMember of workspaceMembers) {
      const workspace = workspaceMember.workspace;
      console.log(`\n📝 Creating notifications for workspace: "${workspace.name}"`);

      // Get subspaces for this workspace
      let subspaces = [];
      try {
        if (prisma.subspace) {
          subspaces = await prisma.subspace.findMany({
            where: { workspaceId: workspace.id },
            take: 5,
          });
        }
      } catch (err) {
        console.log(`  ⚠️  Could not query subspaces: ${err.message}`);
      }

      // Create multiple notifications with 1:3 ratio (25% action-required, 75% informational)
      for (let i = 0; i < notificationsPerWorkspace; i++) {
        const actor = getRandomActor();
        const document = getRandomDocument();
        const shouldBeActionRequired = Math.random() < ACTION_REQUIRED_PROBABILITY;

        if (shouldBeActionRequired) {
          // Create an action-required notification (25% of the time)
          const actionTypes = ['PERMISSION_REQUEST', 'WORKSPACE_INVITATION'];

          // Add SUBSPACE_INVITATION only if subspaces exist
          if (subspaces.length > 0) {
            actionTypes.push('SUBSPACE_INVITATION');
          }

          const randomActionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];

          if (randomActionType === 'PERMISSION_REQUEST') {
            const notification = await createNotification({
              userId: user.id,
              event: 'PERMISSION_REQUEST',
              workspaceId: workspace.id,
              actorId: actor.id,
              documentId: document?.id,
              actionRequired: true,
              actionType: 'PERMISSION_REQUEST',
              metadata: {
                actorName: actor.displayName || actor.email,
                actorAvatar: actor.imageUrl,
                requestedPermission: ['EDIT', 'VIEW', 'COMMENT'][Math.floor(Math.random() * 3)],
                documentTitle: document?.title || `Document ${Math.floor(Math.random() * 1000)}`,
                documentId: document?.id || `doc-${Math.random().toString(36).substr(2, 9)}`,
                message: getRandomMessage('PERMISSION_REQUEST'),
              },
              actionPayload: {
                documentId: document?.id || `doc-${Math.random().toString(36).substr(2, 9)}`,
                requestedPermission: ['EDIT', 'VIEW', 'COMMENT'][Math.floor(Math.random() * 3)],
              },
            });
            console.log(`  ✅ PERMISSION_REQUEST (action-required) created`);
            createdNotifications.push(notification);
            notificationCounts.PERMISSION_REQUEST++;
          } else if (randomActionType === 'WORKSPACE_INVITATION') {
            const workspaceNotification = await createNotification({
              userId: user.id,
              event: 'WORKSPACE_INVITATION',
              workspaceId: workspace.id,
              actorId: actor.id,
              actionRequired: true,
              actionType: 'WORKSPACE_INVITATION',
              metadata: {
                actorName: actor.displayName || actor.email,
                actorAvatar: actor.imageUrl,
                inviterName: actor.displayName || actor.email,
                workspaceName: workspace.name,
                workspaceId: workspace.id,
                role: ['MEMBER', 'EDITOR', 'ADMIN'][Math.floor(Math.random() * 3)],
                message: getRandomMessage('WORKSPACE_INVITATION'),
              },
              actionPayload: {
                workspaceId: workspace.id,
                role: ['MEMBER', 'EDITOR', 'ADMIN'][Math.floor(Math.random() * 3)],
              },
            });
            console.log(`  ✅ WORKSPACE_INVITATION (action-required) created`);
            createdNotifications.push(workspaceNotification);
            notificationCounts.WORKSPACE_INVITATION++;
          } else if (randomActionType === 'SUBSPACE_INVITATION' && subspaces.length > 0) {
            const subspace = subspaces[Math.floor(Math.random() * subspaces.length)];
            const subspaceNotification = await createNotification({
              userId: user.id,
              event: 'SUBSPACE_INVITATION',
              workspaceId: workspace.id,
              actorId: actor.id,
              actionRequired: true,
              actionType: 'SUBSPACE_INVITATION',
              metadata: {
                actorName: actor.displayName || actor.email,
                actorAvatar: actor.imageUrl,
                inviterName: actor.displayName || actor.email,
                subspaceName: subspace.name,
                subspaceId: subspace.id,
                workspaceName: workspace.name,
                workspaceId: workspace.id,
                role: ['MEMBER', 'MODERATOR'][Math.floor(Math.random() * 2)],
                message: getRandomMessage('SUBSPACE_INVITATION'),
              },
              actionPayload: {
                subspaceId: subspace.id,
                workspaceId: workspace.id,
                role: ['MEMBER', 'MODERATOR'][Math.floor(Math.random() * 2)],
              },
            });
            console.log(`  ✅ SUBSPACE_INVITATION (action-required) created`);
            createdNotifications.push(subspaceNotification);
            notificationCounts.SUBSPACE_INVITATION++;
          }
        } else {
          // Create an informational notification (75% of the time)
          const informationalType = Math.random() < 0.5 ? 'PERMISSION_GRANT' : 'PERMISSION_REJECT';

          if (informationalType === 'PERMISSION_GRANT') {
            const grantNotification = await createNotification({
              userId: user.id,
              event: 'PERMISSION_GRANT',
              workspaceId: workspace.id,
              actorId: actor.id,
              documentId: document?.id,
              metadata: {
                actorName: actor.displayName || actor.email,
                actorAvatar: actor.imageUrl,
                grantedPermission: ['EDIT', 'VIEW', 'COMMENT'][Math.floor(Math.random() * 3)],
                documentTitle: document?.title || `Document ${Math.floor(Math.random() * 1000)}`,
                documentId: document?.id || `doc-${Math.random().toString(36).substr(2, 9)}`,
              },
            });
            console.log(`  ✅ PERMISSION_GRANT (informational) created`);
            createdNotifications.push(grantNotification);
            notificationCounts.PERMISSION_GRANT++;
          } else {
            const rejectReasons = [
              'This document contains sensitive information.',
              'You do not have permission to access this resource.',
              'This content is restricted.',
              'Access denied due to security policy.',
            ];
            const rejectNotification = await createNotification({
              userId: user.id,
              event: 'PERMISSION_REJECT',
              workspaceId: workspace.id,
              actorId: actor.id,
              documentId: document?.id,
              metadata: {
                actorName: actor.displayName || actor.email,
                actorAvatar: actor.imageUrl,
                requestedPermission: ['EDIT', 'VIEW', 'COMMENT'][Math.floor(Math.random() * 3)],
                documentTitle: document?.title || `Confidential Document ${Math.floor(Math.random() * 100)}`,
                documentId: document?.id || `confidential-${Math.random().toString(36).substr(2, 9)}`,
                reason: rejectReasons[Math.floor(Math.random() * rejectReasons.length)],
              },
            });
            console.log(`  ✅ PERMISSION_REJECT (informational) created`);
            createdNotifications.push(rejectNotification);
            notificationCounts.PERMISSION_REJECT++;
          }
        }
      }
    }

    console.log(`\n🎉 Script completed successfully!`);
    console.log(`📊 Summary:`);
    console.log(`  Total notifications created: ${createdNotifications.length}`);
    console.log(`  Workspaces processed: ${workspaceMembers.length}`);
    console.log(`  Notifications per workspace: ~${notificationsPerWorkspace}`);

    // Calculate action-required vs informational counts
    const actionRequiredCount = createdNotifications.filter(n => n.actionRequired).length;
    const informationalCount = createdNotifications.length - actionRequiredCount;
    const actionRequiredPercentage = ((actionRequiredCount / createdNotifications.length) * 100).toFixed(1);
    const informationalPercentage = ((informationalCount / createdNotifications.length) * 100).toFixed(1);

    console.log(`\n📊 Action-required vs Informational:`);
    console.log(`  Action-required: ${actionRequiredCount} (${actionRequiredPercentage}%)`);
    console.log(`  Informational: ${informationalCount} (${informationalPercentage}%)`);
    console.log(`  Ratio: 1:${(informationalCount / actionRequiredCount).toFixed(1)}`);

    console.log(`\n📋 Breakdown by type:`);
    Object.entries(notificationCounts).forEach(([type, count]) => {
      const percentage = ((count / createdNotifications.length) * 100).toFixed(1);
      console.log(`  ${type}: ${count} (${percentage}%)`);
    });

  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
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
  createNotification,
  main,
};
