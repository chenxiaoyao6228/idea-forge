import { Page } from '@playwright/test';
import { createTestUser, verifyUserEmail, getPrisma } from '../../setup/database';
// Note: argon2 will be available at runtime when the API is running
const { hash } = require('argon2');

export interface TestUser {
  email: string;
  password: string;
  hashedPassword?: string;
}

export async function createVerifiedUser(email: string, password: string) {
  const hashedPassword = await hash(password);
  await createTestUser(email, hashedPassword);
  await verifyUserEmail(email);
  return { email, password, hashedPassword };
}

export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

export async function logoutUser(page: Page) {
  // Look for logout button or user menu
  const userMenu = page.locator('[data-testid="user-menu"], .user-menu, [aria-label*="user"]');
  if (await userMenu.isVisible()) {
    await userMenu.click();
    const logoutButton = page.locator('text=Logout, text=Sign out, [data-testid="logout"]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    }
  }
}

export async function clearTestUsers() {
  const prisma = await getPrisma();
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: 'test@',
      },
    },
  });
}

export async function waitForPageLoad(page: Page, expectedUrl?: string) {
  await page.waitForLoadState('networkidle');
  if (expectedUrl) {
    await page.waitForURL(expectedUrl);
  }
}
