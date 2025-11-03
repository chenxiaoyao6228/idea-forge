import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // For now, we'll skip database cleanup at global level
  // Database cleanup will be handled per test as needed
  
  console.log('Global teardown completed');
}

export default globalTeardown;
