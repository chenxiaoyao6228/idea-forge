import { test, expect } from "@playwright/test";
import {
  createTestUser,
  getPrisma,
  verifyUserEmail,
} from "../helpers/database";
import {
  registerUserWithMailSlurp,
  completeRegistrationWithMailSlurp,
  cleanupMailSlurpUser,
  isMailSlurpTestingAvailable,
  createMailSlurpTestUser,
  completeEmailVerificationWithMailSlurp,
  waitForEmailInMailSlurpInbox,
  MailSlurpTestUser,
  extractVerificationCodeFromMailSlurp,
  initializeMailSlurp,
} from "../helpers/email";

function createRandomTestUserEmail(){
  return `test-${Math.random().toString(36).substring(2, 15)}@example.com`
}

test.describe.serial("User Registration", () => {
  let testUser: MailSlurpTestUser | null = null;

  test.beforeAll(async () => {
    // Initialize MailSlurp client
    const mailSlurpConfig = initializeMailSlurp();
    if (!mailSlurpConfig) {
      test.skip(true, "MailSlurp API key not configured");
    }
  });

  test.beforeEach(async () => {
    // Clean up any existing test data
    const prisma = await getPrisma();
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: "@mailslurp.com" } },
          { email: { contains: "test-" } },
        ],
      },
    });
  });

  test.afterEach(async () => {
    // Cleanup MailSlurp resources
    if (testUser) {
      await cleanupMailSlurpUser(testUser);
      testUser = null;
    }
  });

  test.skip("should register a new user successfully", async ({ page }) => {
    // Skip test if MailSlurp is not available
    test.skip(!isMailSlurpTestingAvailable(), "MailSlurp not configured");

    // Create a test email account for this test
    testUser = await createMailSlurpTestUser(
      "password123",
      "email-verification-test"
    );
    const testEmail = testUser.emailAddress;
    const testPassword = testUser.password!;

    await test.step("Register user with test email address", async () => {
      await page.goto("/register");

      // Fill registration form with test email address
      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password").fill(testPassword);
      await page.getByRole("button", { name: "Register" }).click();

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
      const email = await waitForEmailInMailSlurpInbox(testUser!.inbox.id, {
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
      const email = await waitForEmailInMailSlurpInbox(testUser!.inbox.id, {
        timeout: 30000,
        subjectFilter: "Registration",
      });

      // Extract the verification code
      const verificationCode = extractVerificationCodeFromMailSlurp(email);

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
      await page.goto("/register");
      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password").fill(testPassword);
      await page.getByRole("button", { name: "Register" }).click();
    });

    await test.step("Verify error message", async () => {
      await expect(page.locator("text=Email already exists")).toBeVisible();
    });
  });

  test("should validate email format", async ({ page }) => {
    await test.step("Navigate to register page", async () => {
      await page.goto("/register");
      // Wait for the page to be fully loaded
      await page.waitForLoadState("networkidle");
    });

    await test.step("Test email validation on blur", async () => {
      const emailInput = page.getByLabel("Email");
      await emailInput.fill("invalid-email");
      await emailInput.blur(); // Trigger validation on blur

      // Check if validation error appears
      await expect(page.locator("text=Invalid email address")).toBeVisible();
    });

    await test.step("Test email validation on submit", async () => {
      // Clear the field and try again
      await page.getByLabel("Email").fill("");
      await page.getByLabel("Email").fill("invalid-email");
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Register" }).click();

      // Should show validation error
      await expect(page.locator("text=Invalid email address")).toBeVisible();
    });
  });

  test("should validate password length", async ({ page }) => {
    await test.step("Navigate to register page", async () => {
      await page.goto("/register");
      // Wait for the page to be fully loaded
      await page.waitForLoadState("networkidle");
    });

    await test.step("Test password validation on blur", async () => {
      const passwordInput = page.getByLabel("Password");
      await passwordInput.fill("123");
      await passwordInput.blur(); // Trigger validation on blur

      // Check if validation error appears
      await expect(
        page.locator("text=Password must be at least 8 characters")
      ).toBeVisible();
    });

    await test.step("Test password validation on submit", async () => {
      // Clear the field and try again
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("");
      await page.getByLabel("Password").fill("123");
      await page.getByRole("button", { name: "Register" }).click();

      // Should show validation error
      await expect(
        page.locator("text=Password must be at least 8 characters")
      ).toBeVisible();
    });
  });

  test("should handle form validation on blur", async ({ page }) => {
    await test.step("Navigate to register page", async () => {
      await page.goto("/register");
      // Wait for the page to be fully loaded
      await page.waitForLoadState("networkidle");
    });

    await test.step("Test email validation on blur", async () => {
      const emailInput = page.getByLabel("Email");
      await emailInput.fill("invalid-email");
      await emailInput.blur();

      // Check if validation error appears
      await expect(page.locator("text=Invalid email address")).toBeVisible();
    });

    await test.step("Test password validation on blur", async () => {
      const passwordInput = page.getByLabel("Password");
      await passwordInput.fill("123");
      await passwordInput.blur();

      // Check if validation error appears
      await expect(
        page.locator("text=Password must be at least 8 characters")
      ).toBeVisible();
    });
  });

  test("should disable submit button during form submission", async ({
    page,
  }) => {
    await test.step("Navigate to register page", async () => {
      await page.goto("/register");
    });

    await test.step("Fill form and submit", async () => {
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");

      const submitButton = page.getByRole("button", { name: "Register" });
      await submitButton.click();

      // Button should be disabled during submission
      await expect(submitButton).toBeDisabled();
    });
  });

  test("should navigate to login page when clicking sign in link", async ({
    page,
  }) => {
    await test.step("Navigate to register page", async () => {
      await page.goto("/register");
    });

    await test.step("Click sign in link", async () => {
      await page.getByRole("link", { name: "Sign in" }).click();
    });

    await test.step("Verify navigation to login page", async () => {
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test("should handle redirectTo parameter in sign in link", async ({
    page,
  }) => {
    const redirectPath = "/dashboard";

    await test.step("Navigate to register page with redirectTo", async () => {
      await page.goto(
        `/register?redirectTo=${encodeURIComponent(redirectPath)}`
      );
    });

    await test.step(
      "Click sign in link and verify redirect parameter",
      async () => {
        await page.getByRole("link", { name: "Sign in" }).click();
        await expect(page).toHaveURL(
          new RegExp(`/login.*redirectTo=${encodeURIComponent(redirectPath)}`)
        );
      }
    );
  });

  test("should support keyboard navigation", async ({ page }) => {
    await test.step("Navigate to register page", async () => {
      await page.goto("/register");
    });

    await test.step("Test tab navigation", async () => {
      await page.keyboard.press("Tab"); // Focus email field
      await expect(page.getByLabel("Email")).toBeFocused();

      await page.keyboard.press("Tab"); // Focus password field
      await expect(page.getByLabel("Password")).toBeFocused();

      await page.keyboard.press("Tab"); // Focus submit button
      await expect(
        page.getByRole("button", { name: "Register" })
      ).toBeFocused();
    });

    await test.step("Test form submission with Enter key", async () => {
      await page.getByLabel("Email").fill("test@example.com");
      await page.getByLabel("Password").fill("password123");
      await page.keyboard.press("Enter");

      // Should redirect to verify page
      await expect(page).toHaveURL(/\/verify/);
    });
  });

  //==============================================

  test("should show error for invalid verification code", async ({ page }) => {
    const testEmail = "invalid-code@example.com";
    const invalidCode = "000000";

    await test.step("Navigate to register page", async () => {
      await page.goto("/register");
    });

    await test.step("Fill registration form", async () => {
      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Register" }).click();
    });

    await test.step("Verify redirect to verification page", async () => {
      await expect(page).toHaveURL(/\/verify/);
    });

    await test.step("Submit invalid verification code", async () => {
      await page.getByRole("textbox").fill(invalidCode);
      await page.getByRole("button", { name: "Submit" }).click();
    });

    await test.step("Verify error message", async () => {
      await expect(
        page.locator("text=Invalid verification code")
      ).toBeVisible();
    });
  });

  test("should validate verification code format", async ({ page }) => {
    const testEmail = "format-test@example.com";

    await test.step("Navigate to register page", async () => {
      await page.goto("/register");
    });

    await test.step("Fill registration form", async () => {
      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Register" }).click();
    });

    await test.step("Verify redirect to verification page", async () => {
      await expect(page).toHaveURL(/\/verify/);
    });

    await test.step("Test invalid code formats", async () => {
      const invalidCodes = ["abcdef", "12345a"];

      for (const code of invalidCodes) {
        await page.getByRole("textbox").fill(code);
        await page.getByRole("button", { name: "Submit" }).click();

        // Should show validation error
        await expect(
          page.locator("text=Invalid verification code")
        ).toBeVisible();

        // Clear the input for next test
        await page.getByRole("textbox").clear();
      }
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

  test("should support keyboard navigation on verify page", async ({
    page,
  }) => {
    const testEmail = createRandomTestUserEmail()

    await test.step("Navigate to register page", async () => {
      await page.goto("/register");
    });

    await test.step("Fill registration form", async () => {
      await page.getByLabel("Email").fill(testEmail);
      await page.getByLabel("Password").fill("password123");
      await page.getByRole("button", { name: "Register" }).click();
    });

    await test.step("Verify redirect to verification page", async () => {
      await expect(page).toHaveURL(/\/verify/);
    });


    await test.step("Test form submission with Enter key", async () => {
      await page.getByRole("textbox").fill("123456");
      await page.keyboard.press("Enter");

      // Should attempt verification
      await expect(
        page.locator("text=Invalid verification code")
      ).toBeVisible();
    });
  });

  test("should handle missing email parameter gracefully", async ({ page }) => {
    await test.step("Navigate to verify page without email", async () => {
      await page.goto("/verify?type=register");
    });

    await test.step("Verify error handling", async () => {
      // Should show error or redirect to appropriate page
      await expect(page.locator("text=Email is required")).toBeVisible();
    });
  });

  test("should handle invalid email parameter", async ({ page }) => {
    await test.step("Navigate to verify page with invalid email", async () => {
      await page.goto("/verify?email=invalid-email&type=register");
    });

    await test.step("Verify error handling", async () => {
      // Should show error for invalid email format
      await expect(page.locator("text=Invalid email address")).toBeVisible();
    });
  });
});
