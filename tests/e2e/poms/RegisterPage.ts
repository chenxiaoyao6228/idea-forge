import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * REGISTER PAGE OBJECT
 * Follows POM principles:
 * - Public methods represent services the page offers
 * - No internal implementation exposed  
 * - No assertions (return data for tests to assert)
 * - Methods can return other page objects
 * - Focus on what users can do, not how
 */
export class RegisterPage extends BasePage {
  // Form elements - using recommended locator strategy
  public readonly emailInput: Locator;
  public readonly passwordInput: Locator;
  private readonly submitButton: Locator;

  // Error elements - using data-testid strategy
  private readonly formErrors: Locator;

  constructor(page: Page) {
    super(page);
    
    // Form elements - prefer data-testid > role-based > label-based
    this.emailInput = this.getByLabel('Email');
    this.passwordInput = this.page.locator('input[type="password"]');
    this.submitButton = this.getByRole('button', { name: 'Register' });

    // Error elements
    this.formErrors = this.getByTestId('form-errors');
  }

  /**
   * Navigate to the register page
   */
  async goto(): Promise<void> {
    await super.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill email input field
   */
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password input field
   */
  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the registration form
   */
  async submitForm(): Promise<void> {
    await this.submitButton.click();
  }

  /**
   * Complete registration form with email and password
   * Convenience method that combines fill and submit actions
   */
  async register(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submitForm();
  }

  /**
   * Get form error text
   */
  async getFormErrorText(): Promise<string> {
    try {
      await this.formErrors.waitFor({ timeout: 2000 });
      return await this.formErrors.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if form is in submitting state
   */
  async isFormSubmitting(): Promise<boolean> {
    try {
      const isDisabled = await this.submitButton.isDisabled();
      const hasPendingClass = await this.submitButton.getAttribute('data-status') === 'pending';
      return isDisabled || hasPendingClass;
    } catch {
      return false;
    }
  }

  /**
   * Wait for redirect after successful registration
   */
  async waitForRedirect(): Promise<void> {
    await this.page.waitForURL(/\/verify/, { timeout: 10000 });
  }

  /**
   * Check if page elements are present and visible
   */
  async arePageElementsPresent(): Promise<boolean> {
    try {
      await this.page.waitForLoadState('networkidle');
      
      const emailVisible = await this.emailInput.isVisible();
      const passwordVisible = await this.passwordInput.isVisible();
      const submitVisible = await this.submitButton.isVisible();
      
      return emailVisible && passwordVisible && submitVisible;
    } catch {
      return false;
    }
  }
}
