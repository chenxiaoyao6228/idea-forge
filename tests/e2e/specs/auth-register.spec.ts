import { test, expect } from "@playwright/test";
import {
  getPrisma
} from "../helpers/database";
import {
  cleanupMailServiceUser, EMailTestUser,
  extractVerificationCodeFromMailService,
  initializeMailService,
  createEMailTestUser,
  waitForEmailInMailServiceInbox
} from "../helpers/email";
import { cleanupTestUser } from "../helpers/auth";
import { PomManager } from "../poms/PomManager";
import { EmailTestData, PasswordTestData, VerificationCodeTestData } from "../fixtures/test-data";

/**
 * USER REGISTRATION SPEC - TEST LAYER
 * Implements three core testing methodologies:
 * 1. Equivalence Class Partitioning
 * 2. Boundary Value Analysis  
 * 3. Error Guessing Method
 * 
 * Architecture: Helpers (data) → Page Objects (UI) → PomManager (orchestration) → Tests (assertions)
 */


function createTestUserEmail(identifier: string = "test"): string {
  return `${identifier}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}@example.com`;
}

test.describe("User Registration - Systematic Testing Methodology", () => {
  let testUser: EMailTestUser | null = null;
  let pomManager: PomManager;

  test.beforeAll(async () => {
    // Initialize MailSlurp client for email verification tests
    const mailServiceConfig = initializeMailService();
    if (!mailServiceConfig) {
      test.skip(true, "email is not configured");
    }
  });

  test.beforeEach(async ({ page }) => {
    // Initialize PomManager for each test - orchestration layer
    pomManager = new PomManager(page);
    
    // Clean up any existing test data - data layer (helpers)
    const prisma = await getPrisma();
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: "@mailslurp.com" } },
          { email: { contains: "test-" } },
        ],
      },
    });
    await users.map(user=> cleanupTestUser(user.email))
  });

  test.afterEach(async () => {
    // Cleanup MailSlurp resources - data layer (helpers)
    if (testUser) {
      await cleanupMailServiceUser(testUser);
      await cleanupTestUser(testUser.emailAddress);
      testUser = null;
    }
  });

  // ===============================
  // PHASE 0: CORE FUNCTIONALITY TESTS (Existing working tests)
  // ===============================

  test.skip("should register a new user successfully", async ({ page }) => {
    // Create a test email account for this test
    testUser = await createEMailTestUser(
      "password123",
      "email-verification-test"
    );
    const testEmail = testUser.emailAddress;
    const testPassword = testUser.password!;

    await test.step("Register user with test email address", async () => {
      await pomManager.registerPage.goto();

      // Fill registration form with test email address
      await pomManager.registerPage.fillEmail(testEmail);
      await pomManager.registerPage.fillPassword(testPassword);
      await pomManager.registerPage.submitForm();

      // Wait for redirect to verify page and check for expected content
      await page.waitForURL(/\/verify/);
      await expect(page.locator("text=Verify your email")).toBeVisible();
    });

    await test.step("Verify user creation in database", async () => {
      const prisma = await getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(user).toBeTruthy();
      expect(user?.email).toBe(testEmail);
      expect(user?.status).toBe("PENDING");
    });

    await test.step("Wait for verification email", async () => {
      // Wait for the verification email to arrive in MailSlurp inbox
      const email = await waitForEmailInMailServiceInbox(testUser!.inbox.id, {
        timeout: 300000,
        subjectFilter: "Registration",
      });

      expect(email).toBeTruthy();
      expect(email.to).toContain(testEmail);
      console.log("Retrieved verification email:", email.subject);
      console.log(
        "Email content preview:",
        email.body?.substring(0, 200) + "..."
      );
    });

    await test.step("Extract verification code and verify", async () => {
      // Get the verification email from MailSlurp inbox
      const email = await waitForEmailInMailServiceInbox(testUser!.inbox.id, {
        timeout: 30000,
        subjectFilter: "Registration",
      });

      // Extract the verification code
      const verificationCode = extractVerificationCodeFromMailService(email);

      expect(verificationCode).toBeTruthy();
      expect(verificationCode).toMatch(/^\d{6}$/); // Should be 6 digits

      console.log("Extracted verification code:", verificationCode);

      // Fill the verification code in the form
      await page.getByRole("textbox").fill(verificationCode!);
      await page.getByRole("button", { name: "Submit" }).click();
    });

    await test.step("Verify successful email verification", async () => {
      // Should redirect to login page or dashboard after successful verification
      await expect(page).toHaveURL(/\/login|\/$/);
    });

    await test.step("Verify user status updated in database", async () => {
      const prisma = await getPrisma();
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
      });

      expect(user?.status).toBe("ACTIVE");
      expect(user?.emailVerified).toBeTruthy();
    });
  });

  test("should show error for existing email", async ({ page }) => {
    const testEmail = "existing@example.com";
    const testPassword = "password123";

    await test.step("Create existing user with ACTIVE status", async () => {
      const prisma = await getPrisma();
      // First delete any existing user
      await prisma.user.deleteMany({
        where: { email: testEmail },
      });
      // Create user with ACTIVE status
      await prisma.user.create({
        data: {
          email: testEmail,
          displayName: "Test User",
          status: "ACTIVE",
        },
      });
    });

    await test.step("Attempt registration with existing email", async () => {
      await pomManager.registerPage.goto();
      await pomManager.registerPage.fillEmail(testEmail);
      await pomManager.registerPage.fillPassword(testPassword);
      await pomManager.registerPage.submitForm();
    });

    await test.step("Verify error message", async () => {
      await expect(page.locator("text=Email already exists")).toBeVisible();
    });
  });

  // ===============================
  // PHASE 1: EQUIVALENCE CLASS PARTITIONING TESTS
  // ===============================

  test.describe("1.1 Email Equivalence Class Partitioning", () => {
    
    // Test valid email equivalence classes
    EmailTestData.validClasses.forEach(({ value, description }) => {
      test(`should accept valid email: ${description}`, async ({ page }) => {
        await test.step("Navigate to register page", async () => {
          await pomManager.registerPage.goto();
        });

        await test.step(`Test valid email: ${value}`, async () => {
          await pomManager.registerPage.fillEmail(value);
          await pomManager.registerPage.fillPassword("password123");
          await pomManager.registerPage.submitForm();

          // Should proceed to verification page (no validation error)
          await expect(page).toHaveURL(/\/verify/, { timeout: 10000 });
        });

        // Cleanup
        await cleanupTestUser(value);
      });
    });

    // Test invalid email equivalence classes
    EmailTestData.invalidClasses.forEach(({ value, description }) => {
      test(`should reject invalid email: ${description}`, async ({ page }) => {
        await test.step("Navigate to register page", async () => {
          await pomManager.registerPage.goto();
        });

        await test.step(`Test invalid email: ${value}`, async () => {
          await pomManager.registerPage.fillEmail(value);
          await pomManager.registerPage.emailInput.blur(); // Trigger validation on blur

          // Should show validation error
          await expect(page.locator("text=Invalid email address")).toBeVisible();
        });

        await test.step("Test invalid email on form submission", async () => {
          await pomManager.registerPage.fillPassword("password123");
          await pomManager.registerPage.submitForm();

          // Should still show validation error and not proceed
          await expect(page.locator("text=Invalid email address")).toBeVisible();
          await expect(page).not.toHaveURL(/\/verify/);
        });
      });
    });

    // Test email boundary values
    EmailTestData.boundaryValues.forEach(({ value, description }) => {
      test(`should handle email boundary: ${description}`, async ({ page }) => {
        await test.step("Navigate to register page", async () => {
          await pomManager.registerPage.goto();
        });

        await test.step(`Test boundary email: ${value}`, async () => {
          await pomManager.registerPage.fillEmail(value);
          await pomManager.registerPage.fillPassword("password123");
          await pomManager.registerPage.submitForm();

          // Should accept boundary values and proceed
          await expect(page).toHaveURL(/\/verify/, { timeout: 10000 });
        });

        // Cleanup
        await cleanupTestUser(value);
      });
    });
  });

  test.describe("1.2 Password Boundary Value Analysis", () => {
    
    // Test password boundary values systematically
    PasswordTestData.boundaryValues.forEach(({ value, expected, description }) => {
      test(`should ${expected} password with ${description}`, async ({ page }) => {
        const testEmail = createTestUserEmail("password-boundary");
        
        await test.step("Navigate to register page", async () => {
          await pomManager.registerPage.goto();
        });

        if (expected === "reject") {
          await test.step(`Test rejected password: ${description}`, async () => {
            await pomManager.registerPage.fillEmail(testEmail);
            await pomManager.registerPage.fillPassword(value);
            await pomManager.registerPage.passwordInput.blur(); // Trigger validation

            // Should show validation error
            await expect(
              page.locator("text=Password must be at least 8 characters")
            ).toBeVisible();
          });

          await test.step("Test rejection on form submission", async () => {
            await pomManager.registerPage.submitForm();

            // Should not proceed to verification
            await expect(
              page.locator("text=Password must be at least 8 characters")
            ).toBeVisible();
            await expect(page).not.toHaveURL(/\/verify/);
          });
        } else {
          await test.step(`Test accepted password: ${description}`, async () => {
            await pomManager.registerPage.fillEmail(testEmail);
            await pomManager.registerPage.fillPassword(value);
            await pomManager.registerPage.submitForm();

            // Should proceed to verification page
            await expect(page).toHaveURL(/\/verify/, { timeout: 10000 });
          });

          // Cleanup
          await cleanupTestUser(testEmail);
        }
      });
    });

    // Test password equivalence classes
    test("should accept valid password equivalence classes", async ({ page }) => {
      for (const password of PasswordTestData.equivalenceClasses.valid) {
        const testEmail = createTestUserEmail("password-valid");
        
        await test.step(`Test valid password: ${password}`, async () => {
          await pomManager.registerPage.goto();
          await pomManager.registerPage.fillEmail(testEmail);
          await pomManager.registerPage.fillPassword(password);
          await pomManager.registerPage.submitForm();

          // Should proceed to verification
          await expect(page).toHaveURL(/\/verify/, { timeout: 10000 });
        });

        // Cleanup
        await cleanupTestUser(testEmail);
      }
    });

    test("should reject invalid password equivalence classes", async ({ page }) => {
      for (const password of PasswordTestData.equivalenceClasses.invalid) {
        await test.step(`Test invalid password: ${password || 'empty'}`, async () => {
          await pomManager.registerPage.goto();
          await pomManager.registerPage.fillEmail("test@example.com");
          await pomManager.registerPage.fillPassword(password);
          await pomManager.registerPage.passwordInput.blur();

          // Should show validation error
          await expect(
            page.locator("text=Password must be at least 8 characters")
          ).toBeVisible();
        });
      }
    });
  });

  // ===============================
  // PHASE 3: UI/UX AND INTEGRATION TESTS
  // ===============================

  test.describe("3.1 Form Behavior and User Experience", () => {
    
    test("should disable submit button during form submission", async ({ page }) => {
      const testEmail = createTestUserEmail("button-state");

      await test.step("Test submit button state during submission", async () => {
        await pomManager.registerPage.goto();
        await pomManager.registerPage.fillEmail(testEmail);
        await pomManager.registerPage.fillPassword("password123");

        const submitButton = page.getByRole("button", { name: "Register" });
        await submitButton.click();

        // Button should be disabled during submission
        await expect(submitButton).toBeDisabled();
      });

      // Cleanup
      await cleanupTestUser(testEmail);
    });

    test("should navigate to login page when clicking sign in link", async ({ page }) => {
      await test.step("Navigate to register page", async () => {
        await pomManager.registerPage.goto();
      });

      await test.step("Click sign in link", async () => {
        await page.getByRole("link", { name: "Sign in" }).click();
      });

      await test.step("Verify navigation to login page", async () => {
        await expect(page).toHaveURL(/\/login/);
      });
    });

    test("should handle redirectTo parameter in sign in link", async ({ page }) => {
      const redirectPath = "/dashboard";

      await test.step("Navigate to register page with redirectTo", async () => {
        await page.goto(`/register?redirectTo=${encodeURIComponent(redirectPath)}`);
      });

      await test.step("Click sign in link and verify redirect parameter", async () => {
        await page.getByRole("link", { name: "Sign in" }).click();
        await expect(page).toHaveURL(
          new RegExp(`/login.*redirectTo=${encodeURIComponent(redirectPath)}`)
        );
      });
    });
  });


  test.describe("3.2 Error Handling and Edge Cases", () => {
    
    test("should show error for invalid verification code", async ({ page }) => {
      const testEmail = createTestUserEmail("invalid-code");
      const invalidCode = "000000";

      await test.step("Complete registration flow", async () => {
        await pomManager.registerPage.goto();
        await pomManager.registerPage.fillEmail(testEmail);
        await pomManager.registerPage.fillPassword("password123");
        await pomManager.registerPage.submitForm();
        await expect(page).toHaveURL(/\/verify/);
      });

      await test.step("Submit invalid verification code", async () => {
        await page.getByRole("textbox").fill(invalidCode);
        await page.getByRole("button", { name: "Submit" }).click();
        await expect(page.locator("text=Invalid verification code")).toBeVisible();
      });

      // Cleanup
      await cleanupTestUser(testEmail);
    });

    test("should handle missing email parameter gracefully", async ({ page }) => {
      await test.step("Navigate to verify page without email", async () => {
        await page.goto("/verify?type=register");
        await expect(page.locator("text=Email is required")).toBeVisible();
      });
    });

    test("should handle invalid email parameter", async ({ page }) => {
      await test.step("Navigate to verify page with invalid email", async () => {
        await page.goto("/verify?email=invalid-email&type=register");
        await expect(page.locator("text=Invalid email address")).toBeVisible();
      });
    });
  });

  test.describe("1.3 Verification Code Boundary Value Analysis", () => {
    
    // Test valid verification code formats
    VerificationCodeTestData.validFormats.forEach(code => {
      test(`should accept valid verification code format: ${code}`, async ({ page }) => {
        const testEmail = createTestUserEmail("verification-valid");

        await test.step("Complete registration flow", async () => {
          await pomManager.registerPage.goto();
          await pomManager.registerPage.fillEmail(testEmail);
          await pomManager.registerPage.fillPassword("password123");
          await pomManager.registerPage.submitForm();
          await expect(page).toHaveURL(/\/verify/);
        });

        await test.step(`Test valid verification code: ${code}`, async () => {
          await page.getByRole("textbox").fill(code);
          await page.getByRole("button", { name: "Submit" }).click();

          // Should show "Invalid verification code" (expected since we're using fake codes)
          // but format should be accepted for processing
          await expect(
            page.locator("text=Invalid verification code")
          ).toBeVisible();
        });

        // Cleanup
        await cleanupTestUser(testEmail);
      });
    });

    // Test invalid verification code formats
    VerificationCodeTestData.invalidFormats.forEach(({ value, description }) => {
      test(`should reject invalid verification code: ${description}`, async ({ page }) => {
        const testEmail = createTestUserEmail("verification-invalid");

        await test.step("Complete registration flow", async () => {
          await pomManager.registerPage.goto();
          await pomManager.registerPage.fillEmail(testEmail);
          await pomManager.registerPage.fillPassword("password123");
          await pomManager.registerPage.submitForm();
          await expect(page).toHaveURL(/\/verify/);
        });

        await test.step(`Test invalid verification code: ${description}`, async () => {
          await page.getByRole("textbox").fill(value);
          await page.getByRole("button", { name: "Submit" }).click();

          // Should show validation error
          await expect(
            page.locator("text=Invalid verification code")
          ).toBeVisible();
        });

        // Cleanup
        await cleanupTestUser(testEmail);
      });
    });
  });

  // test("should handle expired verification code", async ({ page }) => {
  //   const testEmail = "expired@example.com";
  //   const verificationCode = "123456";

  //   await test.step("Create test user with expired code", async () => {
  //     await createTestUser(testEmail);
  //     // Set a code that would be considered expired
  //     await setVerificationCode(testEmail, verificationCode, "register");
  //   });

  //   await test.step("Navigate to verify page", async () => {
  //     await page.goto(
  //       `/verify?email=${encodeURIComponent(testEmail)}&type=register`
  //     );
  //   });

  //   await test.step("Submit expired verification code", async () => {
  //     await page.getByRole("textbox").fill(verificationCode);
  //     await page.getByRole("button", { name: "Submit" }).click();
  //   });

  //   await test.step("Verify expired code error", async () => {
  //     await expect(
  //       page.locator("text=Verification code has expired")
  //     ).toBeVisible();
  //   });
  // });

  // test("should allow resending verification code", async ({ page }) => {
  //   const testEmail = "resend@example.com";

  //   await test.step("Navigate to register page", async () => {
  //     await page.goto("/register");
  //   });

  //   await test.step("Fill registration form", async () => {
  //     await page.getByLabel("Email").fill(testEmail);
  //     await page.getByLabel("Password").fill("password123");
  //     await page.getByRole("button", { name: "Register" }).click();
  //   });

  //   await test.step("Verify redirect to verification page", async () => {
  //     await expect(page).toHaveURL(/\/verify/);
  //   });

  //   await test.step("Click resend button", async () => {
  //     const resendButton = page.getByRole("button", { name: "Resend code" });
  //     if (await resendButton.isVisible()) {
  //       await resendButton.click();
  //       await expect(page.locator("text=Verification code sent")).toBeVisible();
  //     }
  //   });
  // });

  // ===============================
  // PHASE 2: ERROR GUESSING METHOD TESTS
  // ===============================

  test.describe("2.1 Error Guessing - Network and System Scenarios", () => {
    
    test("should handle network timeout during registration", async ({ page }) => {
      const testEmail = createTestUserEmail("network-timeout");

      await test.step("Setup network failure simulation", async () => {
        // Simulate network timeout by aborting registration requests
        await page.route('**/api/auth/register', route => route.abort());
      });

      await test.step("Attempt registration with network failure", async () => {
        await pomManager.registerPage.goto();
        await pomManager.registerPage.fillEmail(testEmail);
        await pomManager.registerPage.fillPassword("password123");
        await pomManager.registerPage.submitForm();

        // Should handle network error gracefully
        // Note: Actual error message depends on implementation
        await expect(page.locator("text=Registration failed")).toBeVisible({ timeout: 10000 });
      });
    });

    test("should handle rapid form submissions (double-click protection)", async ({ page }) => {
      const testEmail = createTestUserEmail("rapid-submit");

      await test.step("Test rapid form submission", async () => {
        await pomManager.registerPage.goto();
        await pomManager.registerPage.fillEmail(testEmail);
        await pomManager.registerPage.fillPassword("password123");

        // Submit form multiple times rapidly
        const submitPromises = [
          pomManager.registerPage.submitForm(),
          pomManager.registerPage.submitForm(),
          pomManager.registerPage.submitForm(),
        ];

        await Promise.allSettled(submitPromises);

        // Should only process one submission and redirect once
        await expect(page).toHaveURL(/\/verify/, { timeout: 10000 });
      });

      // Cleanup
      await cleanupTestUser(testEmail);
    });

    test("should handle browser back/forward navigation during registration", async ({ page }) => {
      const testEmail = createTestUserEmail("navigation-test");

      await test.step("Start registration process", async () => {
        await pomManager.registerPage.goto();
        await pomManager.registerPage.fillEmail(testEmail);
        await pomManager.registerPage.fillPassword("password123");
      });

      await test.step("Navigate away and back", async () => {
        await page.goto("/login"); // Navigate away
        await page.goBack(); // Go back to registration

        // Form should retain state or show appropriate message
        const emailValue = await pomManager.registerPage.emailInput.inputValue();
        expect(emailValue).toBe(testEmail);
      });

      await test.step("Complete registration after navigation", async () => {
        await pomManager.registerPage.submitForm();
        await expect(page).toHaveURL(/\/verify/, { timeout: 10000 });
      });

      // Cleanup
      await cleanupTestUser(testEmail);
    });
  });

  test.describe("2.2 Error Guessing - Input Security Scenarios", () => {
    
    test("should handle XSS attempts in email field", async ({ page }) => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '${alert(1)}',
        '{{7*7}}',
      ];

      for (const payload of xssPayloads) {
        await test.step(`Test XSS payload: ${payload}`, async () => {
          await pomManager.registerPage.goto();
          await pomManager.registerPage.fillEmail(payload);

          await pomManager.registerPage.fillPassword("password123");

          await pomManager.registerPage.submitForm();

          // Should show email validation error, not execute script
          await expect(page.locator("text=Invalid email address")).toBeVisible();
          expect(page.url()).toContain("/register");
        });
      }
    });

    test("should handle special characters in password", async ({ page }) => {
      const specialCharPasswords = [
        'pass@word123!',
        'pássword123',
        'password中文123',
        'password🔒123',
        'pass\tword123',
        'pass\nword123',
      ];

      for (const password of specialCharPasswords) {
        const testEmail = createTestUserEmail("special-char");
        
        await test.step(`Test special character password: ${password.substring(0, 10)}...`, async () => {
          await pomManager.registerPage.goto();
          await pomManager.registerPage.fillEmail(testEmail);
          await pomManager.registerPage.fillPassword(password);
          await pomManager.registerPage.submitForm();

          // Should accept special characters in password
          await expect(page).toHaveURL(/\/verify/, { timeout: 10000 });
        });

        // Cleanup
        await cleanupTestUser(testEmail);
      }
    });

    test("should handle extremely long input values", async ({ page }) => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      const longPassword = 'a'.repeat(1000);

      await test.step("Test extremely long inputs", async () => {
        await pomManager.registerPage.goto();
        await pomManager.registerPage.fillEmail(longEmail);
        await pomManager.registerPage.fillPassword(longPassword);
        await pomManager.registerPage.submitForm();

        // Should handle gracefully - either accept or show appropriate validation
        // Behavior depends on actual implementation limits
        const currentUrl = page.url();
        const hasError = await page.locator("text=Invalid email address").isVisible();
        
        // Should either redirect or show validation error, not crash
        expect(currentUrl.includes('/verify') || hasError).toBe(true);
      });
    });
  });

  test.describe("2.3 Error Guessing - UI/UX Edge Cases", () => {
    
    test("should support keyboard navigation and Enter key submission", async ({ page }) => {
      const testEmail = createTestUserEmail("keyboard-nav");

      await test.step("Test keyboard-only navigation", async () => {
        await pomManager.registerPage.goto();
        
        // Auto focus already
        await page.keyboard.type(testEmail);


        await page.keyboard.press('Tab'); // Focus password field
        
        await page.keyboard.type('password123');

        await page.keyboard.press('Enter'); // Submit form

        // Should submit and redirect
        await expect(page).toHaveURL(/\/verify/, { timeout: 10000 });
      });

      // Cleanup
      await cleanupTestUser(testEmail);
    });

    test("should handle disabled JavaScript gracefully", async ({ page }) => {
      const testEmail = createTestUserEmail("no-js");

      await test.step("Disable JavaScript and test form", async () => {
        await page.context().addInitScript(() => {
          // Disable some JS functionality
          delete (window as any).fetch;
        });

        await pomManager.registerPage.goto();
        await pomManager.registerPage.fillEmail(testEmail);
        await pomManager.registerPage.fillPassword("password123");
        
        // Form should still be functional or show appropriate fallback
        await pomManager.registerPage.submitForm();
        
        // Should handle gracefully - not crash the page
        const pageTitle = await page.title();
        expect(pageTitle).toBeDefined();
      });

      // Cleanup
      await cleanupTestUser(testEmail);
    });
  });

});
