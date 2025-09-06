export const testUsers = {
  valid: {
    email: 'test@example.com',
    password: 'password123',
  },
  unverified: {
    email: 'unverified@example.com',
    password: 'password123',
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
  existing: {
    email: 'existing@example.com',
    password: 'password123',
  },
} as const;

export const testEmails = {
  valid: 'test@example.com',
  invalid: 'invalid-email',
  nonexistent: 'nonexistent@example.com',
} as const;

export const testPasswords = {
  valid: 'password123',
  short: '123',
  wrong: 'wrongpassword',
} as const;

export const verificationCodes = {
  valid: '123456',
  invalid: '000000',
  expired: '999999',
} as const;
