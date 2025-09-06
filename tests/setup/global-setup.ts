import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // For now, we'll skip database setup at global level
  // Database will be initialized per test as needed
  
  console.log('Global setup completed');
}

export default globalSetup;
