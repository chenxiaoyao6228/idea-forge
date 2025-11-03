import { MailSlurp } from 'mailslurp-client';


export interface MailServiceConfig {
  apiKey: string;
  client: MailSlurp;
}

export interface MailServiceInbox {
  id: string;
  emailAddress: string;
}

export interface MailServiceEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  createdAt: Date;
}

let mailSlurpClient: MailSlurp | null = null;

export interface EMailTestUser {
  inbox: MailServiceInbox;
  emailAddress: string;
  password?: string;
}

/**
 * Initialize MailSlurp client with API key from environment
 * Gracefully handles missing API key for environments that don't use MailSlurp
 */
export function initializeMailService(): MailServiceConfig | null {
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
 * Create a test user with MailService email address
 * Returns user data and inbox for cleanup
 */
export async function createEMailTestUser(
  password: string = 'password123',
  prefix: string = 'test-user'
): Promise<EMailTestUser> {
  if (!isMailServiceAvailable()) {
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
 * Cleanup helper to delete MailSlurp inbox after test
 * Should be called in test teardown
 */
export async function cleanupMailServiceUser(user: EMailTestUser): Promise<void> {
  try {
    await deleteMailServiceInbox(user.inbox.id);
  } catch (error) {
    console.warn(`Failed to cleanup MailSlurp inbox ${user.inbox.id}:`, error);
  }
}

/**
 * Cleanup helper for multiple MailSlurp users
 */
export async function cleanupMailServiceUsers(users: EMailTestUser[]): Promise<void> {
  const cleanupPromises = users.map(user => cleanupMailServiceUser(user));
  await Promise.allSettled(cleanupPromises);
}

/**
 * Wait for any email in a MailSlurp inbox (useful for debugging)
 */
export async function waitForAnyEmailInMailService(
  user: EMailTestUser,
  timeout: number = 30000
): Promise<MailServiceEmail> {
  return await waitForEmailInMailServiceInbox(user.inbox.id, { timeout });
}


/**
 * Create multiple test users for batch testing
 */
export async function createMultipleMailServiceUsers(
  count: number,
  prefix: string = 'batch-user'
): Promise<EMailTestUser[]> {
  const users: EMailTestUser[] = [];
  
  for (let i = 0; i < count; i++) {
    const user = await createEMailTestUser('password123', `${prefix}-${i}`);
    users.push(user);
  }
  
  return users;
}

/**
 * Verify that a MailSlurp email contains expected content
 * Useful for testing email content accuracy
 */
export function verifyEmailContent(
  email: MailServiceEmail,
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
 * Debug helper to log email details
 */
export function logEmailDetails(email: MailServiceEmail): void {
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

/**
 * Get the current MailSlurp client instance
 * Throws error if client is not initialized
 */
export function getMailServiceClient(): MailSlurp {
  if (!mailSlurpClient) {
    throw new Error('MailSlurp client not initialized. Call initializeMailService() first.');
  }
  return mailSlurpClient;
}

/**
 * Check if MailSlurp is available and properly configured
 */
export function isMailServiceAvailable(): boolean {
  return !!process.env.MAILSLURP_API_KEY && !!mailSlurpClient;
}

/**
 * Create a temporary MailSlurp inbox for testing
 * Returns inbox with ID and email address
 */
export async function createMailServiceInbox(
  name?: string,
  description?: string
): Promise<MailServiceInbox> {
  const client = getMailServiceClient();
  
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
export async function deleteMailServiceInbox(inboxId: string): Promise<void> {
  const client = getMailServiceClient();
  
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
export async function waitForEmailInMailServiceInbox(
  inboxId: string,
  options: {
    timeout?: number;
    interval?: number;
    subjectFilter?: string;
    fromFilter?: string;
    minCount?: number;
  } = {}
): Promise<MailServiceEmail> {
  const {
    timeout = 30000, // 30 seconds default
    interval = 2000,  // 2 second polling interval
    subjectFilter,
    fromFilter,
    minCount = 1,
  } = options;

  const client = getMailServiceClient();
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
          
          const mailSlurpEmail: MailServiceEmail = {
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
 * Get all emails from a MailSlurp inbox
 * Useful for debugging and test verification
 */
export async function getAllEmailsFromInbox(inboxId: string): Promise<MailServiceEmail[]> {
  const client = getMailServiceClient();
  
  try {
    const emails = await client.getEmails(inboxId);
    
    // Convert to our standard format
    const mailSlurpEmails: MailServiceEmail[] = await Promise.all(
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
  inbox: MailServiceInbox;
  emailAddress: string;
}> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const name = `${prefix}-${timestamp}-${random}`;
  
  const inbox = await createMailServiceInbox(name, `Test inbox for ${prefix} testing`);
  
  return {
    inbox,
    emailAddress: inbox.emailAddress,
  };
}

/**
 * Cleanup function to delete multiple inboxes
 * Useful for test teardown
 */
export async function cleanupMailServiceInboxes(inboxIds: string[]): Promise<void> {
  const client = getMailServiceClient();
  
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


/// =================== business related emails ======================================


/**
 * Extract multiple verification codes from email (if multiple codes are present)
 */
export function extractAllVerificationCodes(email: MailServiceEmail): string[] {
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
 * Wait for verification email and extract code for a MailSlurp user
 * Pure email logic - no page interactions
 */
export async function waitForVerificationEmail(
  user: EMailTestUser,
  options: {
    timeout?: number;
    emailType?: 'registration' | 'password-reset' | 'change-email';
  } = {}
): Promise<{
  email: MailServiceEmail;
  verificationCode: string;
}> {
  const {
    timeout = 30000,
    emailType = 'registration',
  } = options;

  const subjectFilters = {
    'registration': 'Registration',
    'password-reset': 'reset',
    'change-email': 'change',
  };

  // Wait for verification email and extract code
  const email = await waitForEmailInMailServiceInbox(user.inbox.id, {
    timeout,
    subjectFilter: subjectFilters[emailType],
  });
  
  const verificationCode = extractVerificationCodeFromMailService(email);
  
  if (!verificationCode) {
    throw new Error('Failed to extract verification code from MailSlurp email');
  }
  
  return {
    email,
    verificationCode,
  };
}

/**
 * Wait for password reset email and extract reset code
 * Pure email logic - no page interactions
 */
export async function waitForPasswordResetEmail(
  user: EMailTestUser,
  options: {
    timeout?: number;
  } = {}
): Promise<{
  resetCode: string;
  email: MailServiceEmail;
}> {
  const { timeout = 30000 } = options;
  
  // Wait for reset email
  const email = await waitForEmailInMailServiceInbox(user.inbox.id, {
    timeout,
    subjectFilter: 'reset',
  });
  
  const resetCode = extractVerificationCodeFromMailService(email);
  
  if (!resetCode) {
    throw new Error('Failed to extract reset code from MailSlurp email');
  }
  
  return {
    resetCode,
    email,
  };
}


/**
 * Extract verification code from MailSlurp email content
 * Supports both HTML and text email content
 */
export function extractVerificationCodeFromMailService(email: MailServiceEmail): string | null {
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
 * Test helper: Wait for email verification and extract code from existing inbox
 * Pure email logic - no page interactions
 */
export async function performMailServiceEmailVerification(
  inboxId: string,
  emailType: 'register' | 'password-reset' = 'register',
  options: {
    timeout?: number;
    subjectFilter?: string;
  } = {}
): Promise<{
  email: MailServiceEmail;
  verificationCode: string;
}> {
  const {
    timeout = 30000,
    subjectFilter = emailType === 'register' ? 'Registration' : 'Reset',
  } = options;

  // Wait for verification email
  const email = await waitForEmailInMailServiceInbox(inboxId, {
    timeout,
    subjectFilter,
  });
  
  // Extract verification code
  const verificationCode = extractVerificationCodeFromMailService(email);
  
  if (!verificationCode) {
    throw new Error(`Failed to extract verification code from email. Email content: ${email.body}`);
  }
  
  return {
    email,
    verificationCode,
  };
}
