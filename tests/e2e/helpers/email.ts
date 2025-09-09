import { Page } from '@playwright/test';
import { MailSlurp } from 'mailslurp-client';

export interface MailSlurpTestUser {
  inbox: MailSlurpInbox;
  emailAddress: string;
  password?: string;
}

/**
 * Create a test user with MailSlurp email address
 * Returns user data and inbox for cleanup
 */
export async function createMailSlurpTestUser(
  password: string = 'password123',
  prefix: string = 'test-user'
): Promise<MailSlurpTestUser> {
  if (!isMailSlurpAvailable()) {
    throw new Error('MailSlurp is not available. Check MAILSLURP_API_KEY environment variable.');
  }

  const { inbox, emailAddress } = await createTestEmailAddress(prefix);
  
  return {
    inbox,
    emailAddress,
    password,
  };
}

/**
 * Register a user using MailSlurp email and complete email verification
 * This is the main helper for registration testing with MailSlurp
 */
export async function registerUserWithMailSlurp(
  page: Page,
  options: {
    password?: string;
    userPrefix?: string;
    timeout?: number;
    skipEmailVerification?: boolean;
  } = {}
): Promise<{
  user: MailSlurpTestUser;
  verificationCode?: string;
  email?: MailSlurpEmail;
}> {
  const {
    password = 'password123',
    userPrefix = 'register-test',
    timeout = 30000,
    skipEmailVerification = false,
  } = options;

  // Create test user with MailSlurp email
  const user = await createMailSlurpTestUser(password, userPrefix);
  
  try {
    // Navigate to registration page
    await page.goto('/register');
    
    // Fill registration form
    await page.locator('input[type="email"]').fill(user.emailAddress);
    await page.locator('input[type="password"]').fill(password);
    
    // Submit registration form
    await page.getByRole('button', { name: 'Register' }).click();
    
    if (skipEmailVerification) {
      return { user };
    }
    
    // Wait for verification email and extract code
    const email = await waitForEmailInMailSlurpInbox(user.inbox.id, {
      timeout,
      subjectFilter: 'Registration',
    });
    
    const verificationCode = extractVerificationCodeFromMailSlurp(email);
    
    if (!verificationCode) {
      throw new Error('Failed to extract verification code from MailSlurp email');
    }
    
    return {
      user,
      verificationCode,
      email,
    };
  } catch (error) {
    // Cleanup on error
    await deleteMailSlurpInbox(user.inbox.id);
    throw error;
  }
}

/**
 * Complete email verification process using MailSlurp verification code
 * Assumes user is on the verification page
 */
export async function completeEmailVerificationWithMailSlurp(
  page: Page,
  verificationCode: string
): Promise<void> {
  // Fill verification code
  await page.locator('input[name="code"]').fill(verificationCode);
  
  // Submit verification
  await page.getByRole('button', { name: 'Verify' }).click();
}

/**
 * Full registration and verification flow using MailSlurp
 * Handles the complete user journey from registration to verified account
 */
export async function completeRegistrationWithMailSlurp(
  page: Page,
  options: {
    password?: string;
    userPrefix?: string;
    timeout?: number;
  } = {}
): Promise<{
  user: MailSlurpTestUser;
  verificationCode: string;
}> {
  const {
    password = 'password123',
    userPrefix = 'full-registration',
    timeout = 30000,
  } = options;

  // Register user and get verification code
  const { user, verificationCode, email } = await registerUserWithMailSlurp(page, {
    password,
    userPrefix,
    timeout,
  });
  
  if (!verificationCode) {
    throw new Error('Verification code not received from MailSlurp');
  }
  
  // Complete email verification
  await completeEmailVerificationWithMailSlurp(page, verificationCode);
  
  return {
    user,
    verificationCode,
  };
}

/**
 * Test password reset flow using MailSlurp
 * Initiates password reset and retrieves reset code
 */
export async function initiatePasswordResetWithMailSlurp(
  page: Page,
  emailAddress: string,
  options: {
    timeout?: number;
  } = {}
): Promise<{
  resetCode: string;
  email: MailSlurpEmail;
}> {
  const { timeout = 30000 } = options;
  
  // We need to find the inbox ID for this email address
  // This assumes the email was created by our test helpers
  throw new Error('Password reset with MailSlurp requires inbox tracking. Use registerUserWithMailSlurp first.');
}

/**
 * Enhanced password reset flow that tracks the inbox
 */
export async function passwordResetFlowWithMailSlurp(
  page: Page,
  user: MailSlurpTestUser,
  options: {
    timeout?: number;
  } = {}
): Promise<{
  resetCode: string;
  email: MailSlurpEmail;
}> {
  const { timeout = 30000 } = options;
  
  // Navigate to password reset page
  await page.goto('/forgot-password');
  
  // Fill email address
  await page.locator('input[type="email"]').fill(user.emailAddress);
  
  // Submit password reset request
  await page.getByRole('button', { name: 'Send Reset Code' }).click();
  
  // Wait for reset email
  const email = await waitForEmailInMailSlurpInbox(user.inbox.id, {
    timeout,
    subjectFilter: 'reset',
  });
  
  const resetCode = extractVerificationCodeFromMailSlurp(email);
  
  if (!resetCode) {
    throw new Error('Failed to extract reset code from MailSlurp email');
  }
  
  return {
    resetCode,
    email,
  };
}

/**
 * Login with a MailSlurp test user
 * Assumes the user account is already verified
 */
export async function loginWithMailSlurpUser(
  page: Page,
  user: MailSlurpTestUser
): Promise<void> {
  await page.goto('/login');
  
  await page.locator('input[type="email"]').fill(user.emailAddress);
  await page.locator('input[type="password"]').fill(user.password || 'password123');
  
  await page.getByRole('button', { name: 'Login' }).click();
}

/**
 * Cleanup helper to delete MailSlurp inbox after test
 * Should be called in test teardown
 */
export async function cleanupMailSlurpUser(user: MailSlurpTestUser): Promise<void> {
  try {
    await deleteMailSlurpInbox(user.inbox.id);
  } catch (error) {
    console.warn(`Failed to cleanup MailSlurp inbox ${user.inbox.id}:`, error);
  }
}

/**
 * Cleanup helper for multiple MailSlurp users
 */
export async function cleanupMailSlurpUsers(users: MailSlurpTestUser[]): Promise<void> {
  const cleanupPromises = users.map(user => cleanupMailSlurpUser(user));
  await Promise.allSettled(cleanupPromises);
}

/**
 * Wait for any email in a MailSlurp inbox (useful for debugging)
 */
export async function waitForAnyEmailInMailSlurp(
  user: MailSlurpTestUser,
  timeout: number = 30000
): Promise<MailSlurpEmail> {
  return await waitForEmailInMailSlurpInbox(user.inbox.id, { timeout });
}

/**
 * Check if MailSlurp email testing is available in the current environment
 * Returns true if MAILSLURP_API_KEY is set and client is initialized
 */
export function isMailSlurpTestingAvailable(): boolean {
  return isMailSlurpAvailable();
}

/**
 * Create multiple test users for batch testing
 */
export async function createMultipleMailSlurpUsers(
  count: number,
  prefix: string = 'batch-user'
): Promise<MailSlurpTestUser[]> {
  const users: MailSlurpTestUser[] = [];
  
  for (let i = 0; i < count; i++) {
    const user = await createMailSlurpTestUser('password123', `${prefix}-${i}`);
    users.push(user);
  }
  
  return users;
}

/**
 * Verify that a MailSlurp email contains expected content
 * Useful for testing email content accuracy
 */
export function verifyEmailContent(
  email: MailSlurpEmail,
  expectedContent: {
    subjectContains?: string;
    bodyContains?: string;
    fromContains?: string;
  }
): boolean {
  const { subjectContains, bodyContains, fromContains } = expectedContent;
  
  if (subjectContains && !email.subject.toLowerCase().includes(subjectContains.toLowerCase())) {
    return false;
  }
  
  if (bodyContains && !email.body.toLowerCase().includes(bodyContains.toLowerCase())) {
    return false;
  }
  
  if (fromContains && !email.from.toLowerCase().includes(fromContains.toLowerCase())) {
    return false;
  }
  
  return true;
}

/**
 * Extract multiple verification codes from email (if multiple codes are present)
 */
export function extractAllVerificationCodes(email: MailSlurpEmail): string[] {
  const content = email.body || '';
  const codePattern = /\b\d{6}\b/g;
  const matches = content.match(codePattern) || [];
  
  // Filter out common non-verification patterns
  return matches.filter(code => {
    const num = parseInt(code);
    return num > 100000 && num < 999999 && // Valid range
           !code.startsWith('000') &&       // Not all zeros start
           code !== '123456' &&             // Not test pattern
           code !== '654321';               // Not test pattern
  });
}

/**
 * Debug helper to log email details
 */
export function logEmailDetails(email: MailSlurpEmail): void {
  console.log('[MAILSLURP] Email Details:', {
    id: email.id,
    from: email.from,
    to: email.to,
    subject: email.subject,
    createdAt: email.createdAt,
    bodyLength: email.body.length,
    bodyPreview: email.body.substring(0, 200) + (email.body.length > 200 ? '...' : ''),
  });
}


// MailSlurp client configuration
export interface MailSlurpConfig {
  apiKey: string;
  client: MailSlurp;
}

export interface MailSlurpInbox {
  id: string;
  emailAddress: string;
}

export interface MailSlurpEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  createdAt: Date;
}

let mailSlurpClient: MailSlurp | null = null;

/**
 * Initialize MailSlurp client with API key from environment
 * Gracefully handles missing API key for environments that don't use MailSlurp
 */
export function initializeMailSlurp(): MailSlurpConfig | null {
  const apiKey = process.env.MAILSLURP_API_KEY;
  
  if (!apiKey) {
    console.warn('[MAILSLURP] API key not found in environment variables');
    return null;
  }

  try {
    mailSlurpClient = new MailSlurp({ apiKey });
    console.log('[MAILSLURP] Client initialized successfully');
    
    return {
      apiKey,
      client: mailSlurpClient,
    };
  } catch (error) {
    console.error('[MAILSLURP] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Get the current MailSlurp client instance
 * Throws error if client is not initialized
 */
export function getMailSlurpClient(): MailSlurp {
  if (!mailSlurpClient) {
    throw new Error('MailSlurp client not initialized. Call initializeMailSlurp() first.');
  }
  return mailSlurpClient;
}

/**
 * Check if MailSlurp is available and properly configured
 */
export function isMailSlurpAvailable(): boolean {
  return !!process.env.MAILSLURP_API_KEY && !!mailSlurpClient;
}

/**
 * Create a temporary MailSlurp inbox for testing
 * Returns inbox with ID and email address
 */
export async function createMailSlurpInbox(
  name?: string,
  description?: string
): Promise<MailSlurpInbox> {
  const client = getMailSlurpClient();
  
  try {
    const inbox = await client.createInbox();

    console.log(`[MAILSLURP] Created inbox: ${inbox.emailAddress}`);
    
    return {
      id: inbox.id!,
      emailAddress: inbox.emailAddress!,
    };
  } catch (error) {
    console.error('[MAILSLURP] Failed to create inbox:', error);
    throw new Error(`Failed to create MailSlurp inbox: ${error.message}`);
  }
}

/**
 * Delete a MailSlurp inbox to clean up resources
 */
export async function deleteMailSlurpInbox(inboxId: string): Promise<void> {
  const client = getMailSlurpClient();
  
  try {
    await client.deleteInbox(inboxId);
    console.log(`[MAILSLURP] Deleted inbox: ${inboxId}`);
  } catch (error) {
    console.warn(`[MAILSLURP] Failed to delete inbox ${inboxId}:`, error);
    // Don't throw error on cleanup failure to avoid breaking tests
  }
}

/**
 * Wait for an email to arrive in a MailSlurp inbox
 * Polls the inbox with configurable timeout and filtering options
 */
export async function waitForEmailInMailSlurpInbox(
  inboxId: string,
  options: {
    timeout?: number;
    interval?: number;
    subjectFilter?: string;
    fromFilter?: string;
    minCount?: number;
  } = {}
): Promise<MailSlurpEmail> {
  const {
    timeout = 30000, // 30 seconds default
    interval = 2000,  // 2 second polling interval
    subjectFilter,
    fromFilter,
    minCount = 1,
  } = options;

  const client = getMailSlurpClient();
  const startTime = Date.now();
  
  console.log(`[MAILSLURP] Waiting for email in inbox ${inboxId}`, {
    timeout,
    interval,
    subjectFilter,
    fromFilter,
    minCount,
  });

  while (Date.now() - startTime < timeout) {
    try {
      // Get all emails in the inbox
      const emails = await client.getEmails(inboxId);
      
      if (emails.length >= minCount) {
        // Filter emails based on criteria
        let filteredEmails = emails;
        
        if (subjectFilter) {
          filteredEmails = filteredEmails.filter(email => 
            email.subject?.toLowerCase().includes(subjectFilter.toLowerCase())
          );
        }
        
        if (fromFilter) {
          filteredEmails = filteredEmails.filter(email => 
            email.from?.toLowerCase().includes(fromFilter.toLowerCase())
          );
        }
        
        if (filteredEmails.length > 0) {
          // Get the full email content for the latest matching email
          const latestEmail = filteredEmails[filteredEmails.length - 1];
          const fullEmail = await client.getEmail(latestEmail.id!);
          
          const mailSlurpEmail: MailSlurpEmail = {
            id: fullEmail.id!,
            from: fullEmail.from || 'unknown',
            to: fullEmail.to || [],
            subject: fullEmail.subject || 'No Subject',
            body: fullEmail.body || '',
            createdAt: new Date(fullEmail.createdAt!),
          };
          
          console.log(`[MAILSLURP] Found matching email: ${mailSlurpEmail.subject}`);
          return mailSlurpEmail;
        }
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.warn(`[MAILSLURP] Error polling inbox ${inboxId}:`, error);
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error(`Timeout waiting for email in MailSlurp inbox ${inboxId} after ${timeout}ms`);
}

/**
 * Extract verification code from MailSlurp email content
 * Supports both HTML and text email content
 */
export function extractVerificationCodeFromMailSlurp(email: MailSlurpEmail): string | null {
  const content = email.body || '';
  
  // Common verification code patterns
  const patterns = [
    /verification code[:\s]*(\d{6})/i,
    /code[:\s]*(\d{6})/i,
    /verify[:\s]*(\d{6})/i,
    /confirm[:\s]*(\d{6})/i,
    /registration.*code[:\s]*(\d{6})/i,
    /(\d{6})/g, // Simple 6-digit pattern as fallback
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const code = match[1] || match[0];
      if (/^\d{6}$/.test(code)) {
        console.log(`[MAILSLURP] Extracted verification code: ${code}`);
        return code;
      }
    }
  }
  
  console.warn('[MAILSLURP] No verification code found in email content');
  return null;
}

/**
 * Get all emails from a MailSlurp inbox
 * Useful for debugging and test verification
 */
export async function getAllEmailsFromInbox(inboxId: string): Promise<MailSlurpEmail[]> {
  const client = getMailSlurpClient();
  
  try {
    const emails = await client.getEmails(inboxId);
    
    // Convert to our standard format
    const mailSlurpEmails: MailSlurpEmail[] = await Promise.all(
      emails.map(async (email) => {
        const fullEmail = await client.getEmail(email.id!);
        return {
          id: fullEmail.id!,
          from: fullEmail.from || 'unknown',
          to: fullEmail.to || [],
          subject: fullEmail.subject || 'No Subject',
          body: fullEmail.body || '',
          createdAt: new Date(fullEmail.createdAt!),
        };
      })
    );
    
    console.log(`[MAILSLURP] Retrieved ${mailSlurpEmails.length} emails from inbox ${inboxId}`);
    return mailSlurpEmails;
  } catch (error) {
    console.error(`[MAILSLURP] Failed to get emails from inbox ${inboxId}:`, error);
    throw error;
  }
}

/**
 * Helper function to create a test email address using MailSlurp
 * Returns both the inbox and email address for easy cleanup
 */
export async function createTestEmailAddress(prefix: string = 'test'): Promise<{
  inbox: MailSlurpInbox;
  emailAddress: string;
}> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const name = `${prefix}-${timestamp}-${random}`;
  
  const inbox = await createMailSlurpInbox(name, `Test inbox for ${prefix} testing`);
  
  return {
    inbox,
    emailAddress: inbox.emailAddress,
  };
}

/**
 * Cleanup function to delete multiple inboxes
 * Useful for test teardown
 */
export async function cleanupMailSlurpInboxes(inboxIds: string[]): Promise<void> {
  const client = getMailSlurpClient();
  
  console.log(`[MAILSLURP] Cleaning up ${inboxIds.length} inboxes`);
  
  const cleanupPromises = inboxIds.map(async (inboxId) => {
    try {
      await client.deleteInbox(inboxId);
      console.log(`[MAILSLURP] Cleaned up inbox: ${inboxId}`);
    } catch (error) {
      console.warn(`[MAILSLURP] Failed to cleanup inbox ${inboxId}:`, error);
    }
  });
  
  await Promise.all(cleanupPromises);
}

/**
 * Test helper: Complete email verification flow using MailSlurp
 * Creates inbox, waits for email, extracts code, and cleans up
 */
export async function performMailSlurpEmailVerification(
  emailType: 'register' | 'password-reset' = 'register',
  options: {
    timeout?: number;
    subjectFilter?: string;
    cleanup?: boolean;
  } = {}
): Promise<{
  inbox: MailSlurpInbox;
  email: MailSlurpEmail;
  verificationCode: string;
}> {
  const {
    timeout = 30000,
    subjectFilter = emailType === 'register' ? 'Registration' : 'Reset',
    cleanup = true,
  } = options;

  // Create temporary inbox
  const inbox = await createMailSlurpInbox(`${emailType}-test-${Date.now()}`);
  
  try {
    // Wait for verification email
    const email = await waitForEmailInMailSlurpInbox(inbox.id, {
      timeout,
      subjectFilter,
    });
    
    // Extract verification code
    const verificationCode = extractVerificationCodeFromMailSlurp(email);
    
    if (!verificationCode) {
      throw new Error(`Failed to extract verification code from email. Email content: ${email.body}`);
    }
    
    return {
      inbox,
      email,
      verificationCode,
    };
  } catch (error) {
    // Always cleanup on error
    if (cleanup) {
      await deleteMailSlurpInbox(inbox.id);
    }
    throw error;
  } finally {
    // Cleanup if requested (default: true)
    if (cleanup) {
      // Small delay to ensure email processing is complete
      setTimeout(() => deleteMailSlurpInbox(inbox.id), 1000);
    }
  }
}
