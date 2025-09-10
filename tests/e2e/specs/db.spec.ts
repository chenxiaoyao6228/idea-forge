import { test, expect } from '@playwright/test';
import { setupDatabase, cleanupDatabase, getPrisma } from '../helpers/database';

async function createTestUser(email: string, password?: string) {
  const prisma = await getPrisma();
  
  // First, try to delete any existing user with this email
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      await prisma.user.delete({
        where: { email },
      });
      console.log(`Deleted existing user: ${email}`);
    } else {
      console.log(`No existing user to delete: ${email}`);
    }
  } catch (error) {
    // User doesn't exist, that's fine
    console.log(`No existing user to delete: ${email}`);
  }
  
  try {
    const user = await prisma.user.create({
      data: {
        email,
        displayName: 'Test User',
        status: 'PENDING',
        password: password ? {
          create: {
            hash: password,
          },
        } : undefined,
      },
    });
    
    console.log(`Created user: ${email} with ID: ${user.id}`);
    return user;
  } catch (error) {
    console.error(`Failed to create user ${email}:`, error);
    throw error;
  }
}

test.describe.serial('Database Connection', () => {
  test.beforeEach(async () => {
    // Setup database connection
    await setupDatabase();
  });

  test.afterEach(async () => {
    // Cleanup database
    await cleanupDatabase();
  });

  test('should connect to database successfully', async () => {
    const prisma = await getPrisma();
    
    // Test basic database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('test', 1);
  });

  test('should clean up database properly', async () => {
    const testEmail = 'cleanup-test@example.com';
    
    // Create a test user
    const user = await createTestUser(testEmail);
    expect(user).toBeTruthy();
    expect(user.email).toBe(testEmail);

    // Verify user exists in database
    const prisma = await getPrisma();
    let foundUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    expect(foundUser).toBeTruthy();
    expect(foundUser?.email).toBe(testEmail);

    // Cleanup database
    await cleanupDatabase();

    // Verify user is gone (this will fail if cleanup didn't work)
    // Note: We need to reconnect after cleanup
    const prisma2 = await getPrisma();
    foundUser = await prisma2.user.findUnique({
      where: { email: testEmail },
    });
    expect(foundUser).toBeNull();
  });
});
