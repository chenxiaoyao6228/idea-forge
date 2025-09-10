import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * VERIFY PAGE OBJECT
 * Follows POM principles:
 * - Public methods represent services the page offers
 * - No internal implementation exposed  
 * - No assertions (return data for tests to assert)
 * - Methods can return other page objects
 * - Focus on what users can do, not how
 */
export class VerifyPage extends BasePage {
  // Form elements - using recommended locator strategy
  private readonly otpInput: Locator;
  private readonly submitButton: Locator;

  // Error elements - using data-testid strategy
  private readonly formErrors: Locator;
  private readonly codeError: Locator;

  constructor(page: Page) {
    super(page);
    
    // Form elements - prefer data-testid > role-based > label-based
    this.otpInput = this.page.locator('input[type="text"][inputmode="numeric"]');
    this.submitButton = this.getByRole('button', { name: 'Submit' });

    // Error elements
    this.formErrors = this.getByTestId('form-errors');
    this.codeError = this.getByTestId('code-error');
  }

  /**
   * Navigate to the verify page with email and type parameters
   */
  async gotoWithParams(email: string, type: 'register' | 'reset-password' | 'change-email'): Promise<void> {
    const url = `/verify?email=${encodeURIComponent(email)}&type=${type}`;
    await super.goto(url);
  }

  /**
   * Fill verification code input field
   */
  async fillVerificationCode(code: string): Promise<void> {
    await this.otpInput.fill(code);
  }

  /**
   * Submit the verification code form
   */
  async submitCode(): Promise<void> {
    await this.submitButton.click();
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
   * Get code field error text
   */
  async getCodeErrorText(): Promise<string> {
    try {
      await this.codeError.waitFor({ timeout: 2000 });
      return await this.codeError.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if form is in submitting state
   */
  async isFormSubmitting(): Promise<boolean> {
    try {
      const button = this.getByRole('button', { name: 'Submit' });
      const isDisabled = await button.isDisabled();
      const hasPendingClass = await button.getAttribute('data-status') === 'pending';
      return isDisabled || hasPendingClass;
    } catch {
      return false;
    }
  }

  /**
   * Check if verification code is valid (6 digits)
   */
  async isCodeValid(): Promise<boolean> {
    try {
      const codeValue = await this.otpInput.inputValue();
      return codeValue.length === 6 && /^\d{6}$/.test(codeValue);
    } catch {
      return false;
    }
  }

  /**
   * Check if page elements are present and visible
   */
  async arePageElementsPresent(): Promise<boolean> {
    try {
      const otpVisible = await this.otpInput.isVisible();
      const submitVisible = await this.submitButton.isVisible();
      
      return otpVisible && submitVisible;
    } catch {
      return false;
    }
  }

  /**
   * Wait for redirect after successful code verification
   */
  async waitForRedirect(): Promise<void> {
    // Wait for redirect away from verify page
    await this.page.waitForURL(url => !url.pathname.includes('/verify'), { timeout: 10000 });
  }

  /**
   * Wait for error message to appear
   */
  async waitForErrorMessage(): Promise<void> {
    await this.formErrors.waitFor({ timeout: 5000 });
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return await super.getCurrentUrl();
  }

  /**
   * Get page title based on verification type
   */
  async getPageTitle(): Promise<string> {
    try {
      const titleElement = this.page.locator('h1');
      return await titleElement.textContent() || '';
    } catch {
      return '';
    }
  }

  /**
   * Check if page shows error state (missing email/type parameters)
   */
  async isErrorState(): Promise<boolean> {
    try {
      const errorElement = this.getByText('Error');
      return await errorElement.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Complete email verification process using verification code
   * Fills code and submits verification form
   */
  async completeEmailVerification(verificationCode: string): Promise<void> {
    await this.fillVerificationCode(verificationCode);
    await this.submitCode();
  }
}
