export const VERIFICATION_CODE_TYPES = [
  "register",
  "reset-password",
  "change-email",
  "2fa",
] as const;

export type VerificationCodeType = (typeof VERIFICATION_CODE_TYPES)[number];


export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED'
} as const;

export type UserStatus = typeof UserStatus[keyof typeof UserStatus];

export const Provider = {
  google: 'google',
  github: 'github'
} as const;

export type Provider = typeof Provider[keyof typeof Provider];