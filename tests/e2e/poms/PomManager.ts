import { Page, expect } from '@playwright/test';
import { LoginPage, LoginCredentials } from './LoginPage';
import { VerifyPage } from './VerifyPage';
import { RegisterPage } from './RegisterPage';
import { TestUser } from '../helpers/auth';
import { EmailTestUser, waitForPasswordResetEmail, waitForVerificationEmail } from '../helpers/email';

/**
 * POMMANAGER.TS - UI TEST ORCHESTRATION LAYER
 * Handles complex UI test flows using Page Objects
 * Focuses on UI interactions, validations, and test scenarios
 * NO DATA MANAGEMENT - Uses auth.ts for test data
 * Follows POM principles: Service-oriented methods, no assertions in page objects
 */
export class PomManager {
  private page: Page;
  public loginPage: LoginPage;
  public registerPage: RegisterPage;
  public verifyPage: VerifyPage;

  constructor(page: Page) {
    this.page = page;
    this.loginPage = new LoginPage(page);
    this.registerPage = new RegisterPage(page);
    this.verifyPage = new VerifyPage(page);
  }

  /**
   * High-level login flow with success/error handling
   * Different results modeled as return values, not separate methods
   */
  async performLogin(
    credentials: LoginCredentials,
    expectSuccess: boolean = true
  ): Promise<{ success: boolean; error?: string; redirectedTo?: string }> {
    await this.loginPage.goto();
    
    // Set language to English for consistent test results
    await this.page.evaluate(() => {
      localStorage.setItem('lng', 'en');
    });
    
    try {
      await this.loginPage.login(credentials);
      
      if (expectSuccess) {
        await this.loginPage.waitForLoginRedirect();
        const currentUrl = await this.loginPage.getCurrentUrl();
        return { success: true, redirectedTo: currentUrl };
      } else {
        // Wait for error message
        await this.loginPage.waitForErrorMessage();
        const errorText = await this.loginPage.getFormErrorText();
        return { success: false, error: errorText };
      }
    } catch (error) {
      if (expectSuccess) {
        throw error;
      } else {
        const errorText = await this.loginPage.getFormErrorText();
        return { success: false, error: errorText };
      }
    }
  }



  /**
   * Test login with redirectTo parameter
   * Multi-page navigation flow testing
   */
  async testLoginWithRedirectTo(
    credentials: LoginCredentials,
    redirectPath: string
  ): Promise<void> {
    await this.loginPage.gotoWithRedirect(redirectPath);
    await this.loginPage.login(credentials);
    await this.loginPage.waitForLoginRedirect();
    
    const currentUrl = await this.loginPage.getCurrentUrl();
    expect(currentUrl).toMatch(new RegExp(redirectPath));
  }


  /**
   * Test redirectTo parameter preservation through error states
   * Complex workflow with error recovery testing
   */
  async testRedirectToPreservation(
    redirectPath: string,
    wrongCredentials: LoginCredentials,
    correctCredentials: LoginCredentials
  ): Promise<void> {
    await this.loginPage.gotoWithRedirect(redirectPath);
    
    // Submit with wrong credentials
    await this.loginPage.login(wrongCredentials);
    await this.loginPage.waitForErrorMessage();
    
    // Verify redirectTo parameter is still in URL
    await expect(this.page).toHaveURL(
      new RegExp(`redirectTo=${encodeURIComponent(redirectPath)}`)
    );
    
    // Correct password and resubmit
    await this.loginPage.clearPassword();
    await this.loginPage.fillPassword(correctCredentials.password);
    await this.loginPage.submitForm();
    
    // Should redirect to the original redirectTo path
    await expect(this.page).toHaveURL(new RegExp(redirectPath));
  }

  /**
   * Initiate password reset flow
   * Single-page interaction for forgot password form
   */
  async initiatePasswordReset(
    email: string,
    expectSuccess: boolean = true
  ): Promise<{ success: boolean; error?: string; redirectedTo?: string }> {
    await this.forgotPasswordPage.goto();
    
    // Set language to English for consistent test results
    await this.page.evaluate(() => {
      localStorage.setItem('lng', 'en');
    });
    
    try {
      await this.forgotPasswordPage.fillEmail(email);
      await this.forgotPasswordPage.submitForm();
      
      if (expectSuccess) {
        await this.forgotPasswordPage.waitForRedirect();
        const currentUrl = await this.forgotPasswordPage.getCurrentUrl();
        return { success: true, redirectedTo: currentUrl };
      } else {
        // Wait for error message
        await this.forgotPasswordPage.waitForErrorMessage();
        const errorText = await this.forgotPasswordPage.getFormErrorText();
        return { success: false, error: errorText };
      }
    } catch (error) {
      if (expectSuccess) {
        throw error;
      } else {
        const errorText = await this.forgotPasswordPage.getFormErrorText();
        return { success: false, error: errorText };
      }
    }
  }

  /**
   * Verify reset code on verify page
   * Single-page interaction for verification code entry
   */
  async verifyResetCode(
    email: string,
    code: string,
    expectSuccess: boolean = true
  ): Promise<{ success: boolean; error?: string; redirectedTo?: string }> {
    await this.verifyPage.gotoWithParams(email, 'reset-password');
    
    try {
      await this.verifyPage.fillVerificationCode(code);
      await this.verifyPage.submitCode();
      
      if (expectSuccess) {
        await this.verifyPage.waitForRedirect();
        const currentUrl = await this.verifyPage.getCurrentUrl();
        return { success: true, redirectedTo: currentUrl };
      } else {
        // Wait for error message
        await this.verifyPage.waitForErrorMessage();
        const errorText = await this.verifyPage.getFormErrorText();
        return { success: false, error: errorText };
      }
    } catch (error) {
      if (expectSuccess) {
        throw error;
      } else {
        const errorText = await this.verifyPage.getFormErrorText();
        return { success: false, error: errorText };
      }
    }
  }

  /**
   * Complete forgot password flow
   * Multi-page workflow: forgot password → verify code
   */
  async performForgotPasswordFlow(
    email: string,
    verificationCode: string
  ): Promise<{ success: boolean; error?: string; redirectedTo?: string }> {
    // Step 1: Initiate password reset
    const resetResult = await this.initiatePasswordReset(email, true);
    if (!resetResult.success) {
      return resetResult;
    }
    
    // Step 2: Verify the code
    const verifyResult = await this.verifyResetCode(email, verificationCode, true);
    return verifyResult;
  }

  /**
   * Register user with MailSlurp email
   * Handles registration form submission using page objects
   */
  async registerUserWithMailSlurp(
    user: TestUser,
    expectSuccess: boolean = true
  ): Promise<{ success: boolean; error?: string; redirectedTo?: string }> {
    await this.registerPage.goto();
    
    // Set language to English for consistent test results
    await this.page.evaluate(() => {
      localStorage.setItem('lng', 'en');
    });
    
    try {
      await this.registerPage.register(user.emailAddress, user.password || 'password123');
      
      if (expectSuccess) {
        await this.registerPage.waitForRedirect();
        const currentUrl = await this.page.url();
        return { success: true, redirectedTo: currentUrl };
      } else {
        // Wait for error message
        const errorText = await this.registerPage.getFormErrorText();
        return { success: false, error: errorText };
      }
    } catch (error) {
      if (expectSuccess) {
        throw error;
      } else {
        const errorText = await this.registerPage.getFormErrorText();
        return { success: false, error: errorText };
      }
    }
  }

  /**
   * Complete registration and verification flow with MailSlurp
   * Multi-page workflow: register → verify email
   */
  async completeRegistrationWithMailSlurp(
    user: TestUser,
    options: {
      timeout?: number;
    } = {}
  ): Promise<{ success: boolean; error?: string; verificationCode?: string }> {
    const { timeout = 30000 } = options;
    
    // Step 1: Register user
    const registerResult = await this.registerUserWithMailSlurp(user, true);
    if (!registerResult.success) {
      return registerResult;
    }
    
    try {
      // Step 2: Wait for verification email (pure email logic)
      const { verificationCode } = await waitForVerificationEmail(user, {
        timeout,
        emailType: 'registration',
      });
      
      // Step 3: Complete email verification on verify page
      await this.verifyPage.completeEmailVerification(verificationCode);
      
      return {
        success: true,
        verificationCode,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Complete password reset flow with MailSlurp
   * Multi-page workflow: forgot password → wait for email → verify code
   */
  async completePasswordResetWithMailSlurp(
    user: TestUser,
    options: {
      timeout?: number;
    } = {}
  ): Promise<{ success: boolean; error?: string; resetCode?: string }> {
    const { timeout = 30000 } = options;
    
    // Step 1: Initiate password reset
    const resetResult = await this.initiatePasswordReset(user.emailAddress, true);
    if (!resetResult.success) {
      return resetResult;
    }
    
    try {
      // Step 2: Wait for reset email (pure email logic)
      const { resetCode } = await waitForPasswordResetEmail(user, {
        timeout,
      });
      
      // Step 3: Verify the code
      const verifyResult = await this.verifyResetCode(user.emailAddress, resetCode, true);
      
      return {
        success: verifyResult.success,
        error: verifyResult.error,
        resetCode,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Login with MailSlurp test user
   * Assumes the user account is already verified
   */
  async loginWithMailSlurpUser(
    user: TestUser,
    expectSuccess: boolean = true
  ): Promise<{ success: boolean; error?: string; redirectedTo?: string }> {
    await this.loginPage.goto();
    
    // Set language to English for consistent test results
    await this.page.evaluate(() => {
      localStorage.setItem('lng', 'en');
    });
    
    const credentials = {
      email: user.emailAddress,
      password: user.password || 'password123',
    };
    
    return await this.performLogin(credentials, expectSuccess);
  }
}
