import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

/**
 * LOGIN PAGE OBJECT
 * Follows POM principles:
 * - Public methods represent services the page offers
 * - No internal implementation exposed  
 * - No assertions (return data for tests to assert)
 * - Methods can return other page objects
 * - Focus on what users can do, not how
 */
export class LoginPage extends BasePage {
  // Form elements - using recommended locator strategy
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly passwordToggleButton: Locator;
  private readonly loginButton: Locator;
  private readonly forgotPasswordLink: Locator;
  private readonly createAccountLink: Locator;

  // Error elements - using data-testid strategy
  private readonly formErrors: Locator;
  private readonly emailError: Locator;
  private readonly passwordError: Locator;

  // OAuth buttons
  private readonly githubLoginButton: Locator;

  constructor(page: Page) {
    super(page);
    
    // Form elements - prefer data-testid > role-based > label-based
    this.emailInput = this.getByLabel('Email');
    this.passwordInput = this.getByTestId('password-input');
    this.passwordToggleButton = this.getByTestId('password-toggle');
    this.loginButton = this.getByRole('button', { name: 'Log in' });
    this.forgotPasswordLink = this.getByRole('link', { name: 'Forgot password?' });
    this.createAccountLink = this.getByRole('link', { name: 'Create an account' });

    // Error elements
    this.formErrors = this.getByTestId('form-errors');
    this.emailError = this.getByTestId('email-error');
    this.passwordError = this.getByTestId('password-error');

    // OAuth buttons
    this.githubLoginButton = this.getByRole('button', { name: 'Login with GitHub' });
  }

  /**
   * Navigate to the login page
   */
  async goto(): Promise<void> {
    await super.goto('/login');
    await this.waitForPageLoad();
  }

  /**
   * Navigate to login page with redirectTo parameter
   */
  async gotoWithRedirect(redirectTo: string): Promise<void> {
    await super.goto(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
    await this.waitForPageLoad();
  }

  /**
   * Fill email field
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password field
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Clear password field
   */
  async clearPassword(): Promise<void> {
    await this.passwordInput.clear();
  }

  /**
   * Submit the login form
   */
  async submitForm(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Login with credentials - high-level service method
   */
  async login(credentials: LoginCredentials): Promise<void> {
    await this.fillEmail(credentials.email);
    await this.fillPassword(credentials.password);
    await this.submitForm();
  }

  /**
   * Click create account link  
   * Could return RegisterPage object in full implementation
   */
  async clickCreateAccount(): Promise<void> {
    await this.createAccountLink.click();
  }

  /**
   * Check if form errors are visible
   * Returns state information instead of asserting
   */
  async hasFormErrors(): Promise<boolean> {
    try {
      return await this.formErrors.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Get form error text
   * Returns data for test layer to assert
   */
  async getFormErrorText(): Promise<string> {
    if (await this.hasFormErrors()) {
      return await this.formErrors.textContent() || '';
    }
    return '';
  }

  /**
   * Check if login button is disabled
   * Returns state for tests to assert
   */
  async isLoginButtonDisabled(): Promise<boolean> {
    return await this.loginButton.isDisabled();
  }

  /**
   * Wait for successful login redirect
   */
  async waitForLoginRedirect(): Promise<void> {
    await this.page.waitForURL(/\/(?!login)/, { timeout: 10000 });
  }

  /**
   * Wait for error message to appear
   */
  async waitForErrorMessage(): Promise<void> {
    await this.page.waitForSelector('[data-testid="form-errors"]', { timeout: 5000 });
  }

  /**
   * Check if required page elements are present
   * Returns boolean instead of making assertions
   */
  async arePageElementsPresent(): Promise<boolean> {
    try {
      const elements = [
        this.emailInput,
        this.passwordInput,
        this.loginButton,
        this.forgotPasswordLink,
        this.createAccountLink
      ];
      
      for (const element of elements) {
        if (!(await element.isVisible())) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }
}
