
// ===============================
// TEST DATA SETS - Systematic Approach
// ===============================

/** Email Equivalence Classes */
export const EmailTestData = {
  validClasses: [
    { value: "user@example.com", description: "standard format" },
    { value: "test.user@domain.org", description: "with dot in local part" },
    { value: "user+tag@example.com", description: "with plus tag" },
    { value: "user123@test-domain.com", description: "with numbers and hyphens" },
  ],
  invalidClasses: [
    { value: "invalid-email", description: "no @ symbol" },
    { value: "@domain.com", description: "missing local part" },
    { value: "user@", description: "missing domain" },
    { value: "user..user@example.com", description: "consecutive dots" },
    { value: "user@.com", description: "dot after @" },
    { value: "user@example.", description: "domain ends with dot" },
  ],
  boundaryValues: [
    { value: "a@b.co", description: "minimum valid length" },
    { value: "a".repeat(60) + "@" + "b".repeat(60) + ".com", description: "near maximum length" },
  ]
};

/** Password Boundary Values (min=8 chars based on validation) */
export const PasswordTestData = {
  boundaryValues: [
    { value: "1234567", expected: "reject", description: "min-1 (7 chars)" },
    { value: "12345678", expected: "accept", description: "min boundary (8 chars)" },
    { value: "123456789", expected: "accept", description: "min+1 (9 chars)" },
    { value: "a".repeat(50), expected: "accept", description: "reasonable length (50 chars)" },
    { value: "a".repeat(100), expected: "accept", description: "long password (100 chars)" },
  ],
  equivalenceClasses: {
    valid: ["password123", "mySecurePass", "test@Password1"],
    invalid: ["", "123", "pass"], // Too short
  }
};

/** Verification Code Test Data */
export const VerificationCodeTestData = {
  validFormats: ["123456", "000000", "999999"], // 6 digits
  invalidFormats: [
    { value: "abcdef", description: "letters only" },
    { value: "12345a", description: "mixed alphanumeric" },
    { value: "12345", description: "too short (5 digits)" },
    { value: "1234567", description: "too long (7 digits)" },
    { value: "", description: "empty" },
    { value: "!@#$%^", description: "special characters" },
  ]
};