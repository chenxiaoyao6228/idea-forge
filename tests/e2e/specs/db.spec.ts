import { test, expect } from '@playwright/test';
import { setupDatabase, cleanupDatabase, createTestUser, verifyUserEmail, getPrisma } from '../helpers/database';

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

  test('should create and delete a test user', async () => {
    const testEmail = 'db-test@example.com';
    
    // Create a test user
    const user = await createTestUser(testEmail);
    expect(user).toBeTruthy();
    expect(user.email).toBe(testEmail);
    expect(user.status).toBe('PENDING');

    // Verify user exists in database
    const prisma = await getPrisma();
    const foundUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    
    expect(foundUser).toBeTruthy();
    expect(foundUser?.email).toBe(testEmail);
  });

  test('should verify user email successfully', async () => {
    const testEmail = 'verify-test@example.com';
    
    // Create a test user
    const user = await createTestUser(testEmail);
    expect(user.status).toBe('PENDING');

    // Verify the user's email
    await verifyUserEmail(testEmail);

    // Check that user status was updated
    const prisma = await getPrisma();
    const updatedUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    
    expect(updatedUser?.status).toBe('ACTIVE');
    expect(updatedUser?.emailVerified).toBeTruthy();
  });

  test('should handle duplicate email creation', async () => {
    const testEmail = 'duplicate-test@example.com';
    
    // Create first user
    const user1 = await createTestUser(testEmail);
    expect(user1.email).toBe(testEmail);

    // Create second user with same email (should delete first and create new)
    const user2 = await createTestUser(testEmail);
    expect(user2.email).toBe(testEmail);
    expect(user2.id).not.toBe(user1.id);
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
