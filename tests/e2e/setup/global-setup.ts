import { FullConfig } from '@playwright/test';
import { initializeMailSlurp, isMailSlurpAvailable } from '../helpers/email';

async function globalSetup(config: FullConfig) {
  console.log('Starting global setup...');
  
  try {
    // Initialize MailSlurp client for tests
    console.log('Initializing MailSlurp client...');
    const mailSlurpConfig = initializeMailSlurp();
    
    if (mailSlurpConfig) {
      console.log('MailSlurp client initialized successfully');
      console.log('MailSlurp is available for email testing');
    } else {
      console.log('MailSlurp API key not found - MailSlurp testing will be skipped');
      console.log('To enable MailSlurp testing, set MAILSLURP_API_KEY in .env.test');
    }
    
  } catch (error) {
    console.warn('Failed to initialize MailSlurp client:', error);
    console.log('MailSlurp testing will be disabled for this run');
  }
  
  console.log(`- MailSlurp: ${isMailSlurpAvailable() ? 'Available' : 'Not Available'}`);
}

export default globalSetup;
