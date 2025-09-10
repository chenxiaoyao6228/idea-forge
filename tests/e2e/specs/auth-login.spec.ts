import { test, expect } from '@playwright/test';
import {
  createVerifiedTestUser,
  createTestUserWithStatus,
  cleanupTestUser,
  TestUser,
} from '../helpers/auth';
import { PomManager } from '../poms/PomManager';
import { LoginCredentials } from '../poms/LoginPage';

/**
 * AUTH LOGIN SPEC - TEST LAYER
 * High-level test scenarios using clean POM architecture:
 * - Data creation via auth.ts (data layer)
 * - UI interactions via PomManager.ts (orchestration layer)  
 * - Page objects via LoginPage.ts (page layer)
 * - Assertions in test layer only
 */
test.describe('User Login', () => {
  let testUser: TestUser;
  let pomManager: PomManager;

  test.beforeEach(async ({ page }) => {
    // Data creation - using auth.ts (data layer)
    const email = `login-test-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;
    testUser = await createVerifiedTestUser(email, 'password123');
    
    // UI orchestration setup - PomManager (orchestration layer)
    pomManager = new PomManager(page);
  });

  test.afterEach(async () => {
    // Data cleanup - using auth.ts (data layer)
    if (testUser) {
      await cleanupTestUser(testUser.email);
    }
  });

  // ==============================================
  // Phase 1.1: Basic Login Flow
  // ==============================================

  test.describe('1.1 Basic Login Flow', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      const loginPage = pomManager.loginPage;
      const credentials: LoginCredentials = {
        email: testUser.email,
        password: testUser.password,
      };

      await test.step('Navigate to login page', async () => {
        await loginPage.goto();
        await expect(page).toHaveURL(/\/login/);
      });

      await test.step('Verify page elements are present', async () => {
        // Using page object method that returns data, not assertions
        const elementsPresent = await loginPage.arePageElementsPresent();
        expect(elementsPresent).toBe(true);
      });

      await test.step('Fill login form with valid credentials', async () => {
        await loginPage.fillEmail(credentials.email);
        await loginPage.fillPassword(credentials.password);
      });

      await test.step('Submit login form', async () => {
        await loginPage.submitForm();
      });

      await test.step('Verify redirect to home page', async () => {
        await loginPage.waitForLoginRedirect();
        await expect(page).toHaveURL(/\/(?!login)/);
      });

    });


    test('should validate email format', async ({ page }) => {
      const invalidEmails = [
        'invalid-email',
        'test@',
        '@example.com',
        'test..test@example.com',
        'test@.com',
        'test@example.',
      ];

      await test.step('Test invalid email formats', async () => {
        const loginPage = pomManager.loginPage;
        await loginPage.goto();

        for (const invalidEmail of invalidEmails) {
          await loginPage.fillEmail(invalidEmail);
          await loginPage.fillPassword('password123');
          await loginPage.submitForm();

          // Should show validation error
          await expect(page.locator('text=Invalid email')).toBeVisible();
          
          // Clear form for next test
          await loginPage.getByLabel('Email').clear();
        }
      });
    });

    test('should validate password field', async ({ page }) => {
      await test.step('Test empty password submission', async () => {
        const loginPage = pomManager.loginPage;
        await loginPage.goto();
        await loginPage.fillEmail(testUser.email);
        // Leave password empty
        await loginPage.submitForm();

        // Should show validation error
        await expect(page.locator('text=Password is required')).toBeVisible();
      });

      await test.step('Test password visibility toggle', async () => {
        const loginPage = pomManager.loginPage;
        await loginPage.goto();
        await loginPage.fillPassword('password123');
        
        // Initially password should be hidden
        const initialType = await loginPage.getByTestId('password-input').getAttribute('type');
        expect(initialType).toBe('password');
        
        // Toggle to show password
        await loginPage.getByTestId('password-toggle').click();
        const visibleType = await loginPage.getByTestId('password-input').getAttribute('type');
        expect(visibleType).toBe('text');
        
        // Toggle back to hide password
        await loginPage.getByTestId('password-toggle').click();
        const hiddenType = await loginPage.getByTestId('password-input').getAttribute('type');
        expect(hiddenType).toBe('password');
      });
    });

    test('should handle wrong password error', async ({ page }) => {
      await test.step('Login with wrong password', async () => {
        const credentials: LoginCredentials = {
          email: testUser.email,
          password: 'wrongpassword',
        };

        const result = await pomManager.performLogin(credentials, false);

        expect(result.success).toBe(false);
        expect(result.error).toContain('The provided password is incorrect');
      });
    });

    test('should handle user not found error', async ({ page }) => {
      await test.step('Login with non-existent user', async () => {
        const credentials: LoginCredentials = {
          email: 'nonexistent@example.com',
          password: 'password123',
        };

        const result = await pomManager.performLogin(credentials, false);

        expect(result.success).toBe(false);
        expect(result.error).toContain('The specified user could not be found');
      });
    });

    test('should handle account not set error', async ({ page }) => {
      // Create a user without password (OAuth user) using database fallback
      const oauthUserEmail = `oauth-user-${Date.now()}@example.com`;
      await createTestUserWithStatus(oauthUserEmail, 'ACTIVE'); // No password set
      
      await test.step('Login with OAuth user (no password set)', async () => {
        const credentials: LoginCredentials = {
          email: oauthUserEmail,
          password: 'password123',
        };

        const result = await pomManager.performLogin(credentials, false);

        expect(result.success).toBe(false);
        expect(result.error).toContain('Account error');
      });

      // Cleanup
      await cleanupTestUser(oauthUserEmail);
    });

    test('should handle multiple error scenarios', async ({ page }) => {
      const errorScenarios = [
        {
          email: 'invalid-email',
          password: 'password123',
          expectedError: 'Invalid email',
          description: 'invalid email format',
        },
        {
          email: testUser.email,
          password: '',
          expectedError: 'Password is required',
          description: 'empty password',
        },
        {
          email: testUser.email,
          password: 'wrongpassword',
          expectedError: 'The provided password is incorrect',
          description: 'wrong password',
        },
        {
          email: 'nonexistent@example.com',
          password: 'password123',
          expectedError: 'The specified user could not be found',
          description: 'non-existent user',
        },
      ];

      for (const scenario of errorScenarios) {
        await test.step(`Test ${scenario.description}`, async () => {
          const loginPage = pomManager.loginPage;
          await loginPage.goto();
          await loginPage.fillEmail(scenario.email);
          await loginPage.fillPassword(scenario.password);
          await loginPage.submitForm();
          
          // Wait for error message
          await loginPage.waitForErrorMessage();
          const errorText = await loginPage.getFormErrorText();
          expect(errorText).toContain(scenario.expectedError);
        });
      }
    });

    test('should show proper error messages for different error codes', async ({ page }) => {
      const loginPage = pomManager.loginPage;

      await test.step('Test password incorrect error', async () => {
        await loginPage.goto();
        await loginPage.fillEmail(testUser.email);
        await loginPage.fillPassword('wrongpassword');
        await loginPage.submitForm();

        await expect(page.locator('text=The provided password is incorrect')).toBeVisible();
      });

      await test.step('Test user not found error', async () => {
        await loginPage.getByLabel('Email').clear();
        await loginPage.fillEmail('nonexistent@example.com');
        await loginPage.fillPassword('password123');
        await loginPage.submitForm();

        await expect(page.locator('text=The specified user could not be found')).toBeVisible();
      });
    });

    test('should clear errors when form is resubmitted', async ({ page }) => {
      const wrongCredentials: LoginCredentials = {
        email: testUser.email,
        password: 'wrongpassword',
      };
      
      const correctCredentials: LoginCredentials = {
        email: testUser.email,
        password: testUser.password,
      };

      await test.step('Submit wrong credentials and verify error', async () => {
        const loginPage = pomManager.loginPage;
        await loginPage.goto();
        
        // Submit with wrong credentials
        await loginPage.login(wrongCredentials);
        await loginPage.waitForErrorMessage();
        const errorVisible = await loginPage.hasFormErrors();
        expect(errorVisible).toBe(true);
      });

      await test.step('Clear error and submit correct credentials', async () => {
        const loginPage = pomManager.loginPage;
        // Clear and submit with correct credentials
        await loginPage.clearPassword();
        await loginPage.fillPassword(correctCredentials.password);
        await loginPage.submitForm();
        
        // Should redirect (error cleared)
        await loginPage.waitForLoginRedirect();
      });
    });
  });

  // ==============================================
  // Phase 1.2: UI and UX Features
  // ==============================================

  test.describe('1.2 UI and UX Features', () => {

    test('should support Enter key submission', async ({ page }) => {
      const credentials: LoginCredentials = {
        email: testUser.email,
        password: testUser.password,
      };
      
      await test.step('Test Enter key form submission', async () => {
        const loginPage = pomManager.loginPage;
        await loginPage.goto();
        await loginPage.fillEmail(credentials.email);
        await loginPage.fillPassword(credentials.password);
        
        // Press Enter to submit
        await page.keyboard.press('Enter');
        await loginPage.waitForLoginRedirect();
      });
    });

    test('should show button loading states', async ({ page }) => {
      const credentials: LoginCredentials = {
        email: testUser.email,
        password: testUser.password,
      };

      await test.step('Test login button states', async () => {
        const loginPage = pomManager.loginPage;
        await loginPage.goto();
        await loginPage.fillEmail(credentials.email);
        await loginPage.fillPassword(credentials.password);
        
        // Button should be enabled initially
        expect(await loginPage.isLoginButtonDisabled()).toBe(false);
        
        // Click submit
        await loginPage.submitForm();
        
        // Button should be disabled during submission
        expect(await loginPage.isLoginButtonDisabled()).toBe(true);
      });
    });

    test('should navigate to forgot password page', async ({ page }) => {
      await test.step('Navigate to login page', async () => {
        await pomManager.loginPage.goto();
      });

      await test.step('Click forgot password link', async () => {
        await pomManager.loginPage.getByRole('link', { name: 'Forgot password?' }).click();
        await expect(page).toHaveURL(/\/forgot-password/);
      });

      await test.step('Navigate back to login and test create account link', async () => {
        await pomManager.loginPage.goto();
        await pomManager.loginPage.clickCreateAccount();
        await expect(page).toHaveURL(/\/register/);
      });
    });

  });

  // ==============================================
  // Phase 1.3: Redirect Handling
  // ==============================================

  test.describe('1.3 Redirect Handling', () => {

    test('should default to home page without redirectTo', async ({ page }) => {
      const credentials: LoginCredentials = {
        email: testUser.email,
        password: testUser.password,
      };

      const result = await pomManager.performLogin(credentials, true);
      
      expect(result.success).toBe(true);
      expect(result.redirectedTo).toBeDefined();
      expect(result.redirectedTo).not.toContain('redirectTo');
    });

    test('should preserve redirectTo through error states', async ({ page }) => {
      const redirectPath = '/create-workspace';
      const wrongCredentials: LoginCredentials = {
        email: testUser.email,
        password: 'wrongpassword',
      };
      
      const correctCredentials: LoginCredentials = {
        email: testUser.email,
        password: testUser.password,
      };

      await pomManager.testRedirectToPreservation(redirectPath, wrongCredentials, correctCredentials);
    });
  });
});
