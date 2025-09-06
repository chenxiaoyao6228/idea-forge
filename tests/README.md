# Playwright E2E Tests

This directory contains end-to-end tests for the Idea Forge application using Playwright.

## Setup

### Prerequisites

1. Make sure you have the following running:
   - PostgreSQL database
   - Redis server
   - API server (`pnpm --filter api dev`)
   - Client server (`pnpm --filter client dev`)

### Environment Variables

Create a `.env.test` file in the root directory with the following variables:

```env
DATABASE_URL=postgresql://postgres:123456@localhost:5432/ideaforge_test
REDIS_HOST=localhost
REDIS_PORT=6379
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### Database Setup

The tests use a separate test database. Make sure to:

1. Create a test database: `ideaforge_test`
2. Run migrations: `pnpm prisma:migrate:deploy`
3. The tests will automatically clean up data between runs

## Running Tests

```bash
# Run all tests
pnpm test:e2e

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Run tests with UI
pnpm test:e2e:ui

# Run specific test file
pnpm test:e2e tests/e2e/auth-login.spec.ts

# Debug tests
pnpm test:e2e:debug
```

## Email Verification Backdoor

Since the backend doesn't have a built-in backdoor for email verification in tests, we've implemented a testing approach that:

### 1. Database Helper Functions

The `tests/setup/database.ts` file provides helper functions:

- `createTestUser(email, password?)` - Creates a test user
- `verifyUserEmail(email)` - Manually verifies a user's email (bypasses email sending)
- `setVerificationCode(email, code, type)` - Sets verification code in Redis for testing

### 2. Testing Strategy

For email verification tests, we use two approaches:

#### Approach 1: Manual Verification (Backdoor)

```typescript
// Create user
await createTestUser("test@example.com");

// Manually verify email (bypasses email sending)
await verifyUserEmail("test@example.com");

// Now user can login
```

#### Approach 2: Simulated Email Verification

```typescript
// Create user
await createTestUser("test@example.com");

// Set verification code in Redis (simulating email sending)
await setVerificationCode("test@example.com", "123456", "register");

// Navigate to verification page and enter code
await page.goto("/verify?email=test@example.com&type=register");
await page.fill('input[type="text"]', "123456");
await page.click('button[type="submit"]');
```

### 3. Backend Email Verification Backdoor (Optional)

If you want to add a proper backdoor to the backend for testing, you can add this to your auth service:

```typescript
// In apps/api/src/auth/auth.service.ts
@Post('verify-email-backdoor')
@UseGuards(TestGuard) // Only allow in test environment
async verifyEmailBackdoor(@Body() { email }: { email: string }) {
  if (process.env.NODE_ENV !== 'test') {
    throw new ForbiddenException('This endpoint is only available in test environment');
  }

  await this.userService.updateUserStatus(email, UserStatus.ACTIVE);
  return { message: 'Email verified successfully' };
}
```

Then create a test guard:

```typescript
// In apps/api/src/auth/guards/test.guard.ts
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";

@Injectable()
export class TestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return process.env.NODE_ENV === "test";
  }
}
```

## Test Structure

```
tests/
├── setup/
│   ├── database.ts          # Database helpers
│   ├── global-setup.ts      # Global test setup
│   └── global-teardown.ts   # Global test cleanup
├── e2e/
│   ├── auth-login.spec.ts   # Login tests
│   ├── auth-register.spec.ts # Registration tests
│   ├── helpers/
│   │   └── auth-helpers.ts  # Common auth utilities
│   └── fixtures/
│       └── test-data.ts     # Test data constants
└── README.md               # This file
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from "@playwright/test";
import { createVerifiedUser, loginUser } from "./helpers/auth-helpers";

test.describe("Feature Name", () => {
  test.beforeEach(async () => {
    // Setup before each test
  });

  test("should do something", async ({ page }) => {
    // Test implementation
  });
});
```

### Using Test Helpers

```typescript
// Create a verified user
const user = await createVerifiedUser("test@example.com", "password123");

// Login user
await loginUser(page, user.email, user.password);

// Clear test data
await clearTestUsers();
```

## Best Practices

1. **Clean up data** between tests using `beforeEach` hooks
2. **Use helper functions** for common operations
3. **Wait for elements** to be visible before interacting
4. **Use data-testid** attributes for reliable element selection
5. **Test both success and error cases**
6. **Use meaningful test descriptions**

## Troubleshooting

### Common Issues

1. **Database connection errors**: Make sure PostgreSQL and Redis are running
2. **Port conflicts**: Ensure ports 3000 and 3001 are available
3. **Test timeouts**: Increase timeout in playwright.config.ts if needed
4. **Element not found**: Use `page.waitForSelector()` before interacting with elements

### Debug Mode

Run tests in debug mode to step through them:

```bash
pnpm test:e2e:debug
```

This opens the Playwright Inspector where you can:

- Step through tests
- Inspect elements
- View console logs
- Take screenshots
