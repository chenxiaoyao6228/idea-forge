export enum ErrorCodeEnum {
  UserAlreadyExists = 2002,
  UserNotActive = 2004,
  RequestTooFrequent = 1200,
  VerificationCodeInvalid = 3000,
  UserNotFound = 2001,
  PasswordIncorrect = 2003,
  AuthenticationFailed = 1000,
  PermissionDenied = 1001,
  InvalidRefreshToken = 1002,

  // OAuth related
  InvalidTempId = 1003,
  UsernameAlreadyExists = 1004,
  InvalidProvider = 1005,
  PasswordNotSet = 1006,
  AccountError = 1007, // Account error
  SendEmailError = 1008, // Send email error

  AITokenLimitExceeded = 1100,
}

export type ErrorCodeMsg = Record<ErrorCodeEnum, string>;

export const ErrorCodeMsg: ErrorCodeMsg = {
  [ErrorCodeEnum.UserAlreadyExists]: "The user already exists in the system.",
  [ErrorCodeEnum.UserNotActive]: "The user is not active.",
  [ErrorCodeEnum.RequestTooFrequent]: "Requests are being made too frequently. Please try again later.",
  [ErrorCodeEnum.VerificationCodeInvalid]: "The verification code is invalid or has expired.",
  [ErrorCodeEnum.UserNotFound]: "The specified user could not be found.",
  [ErrorCodeEnum.PasswordIncorrect]: "The provided password is incorrect.",
  [ErrorCodeEnum.AuthenticationFailed]: "Authentication failed. Please check your credentials.",
  [ErrorCodeEnum.PermissionDenied]: "You do not have permission to perform this action.",
  [ErrorCodeEnum.InvalidRefreshToken]: "The refresh token is invalid or has expired.",
  [ErrorCodeEnum.InvalidTempId]: "The tempId is invalid or has expired.",
  [ErrorCodeEnum.UsernameAlreadyExists]: "The displayName already exists.",
  [ErrorCodeEnum.InvalidProvider]: "Invalid provider.",
  [ErrorCodeEnum.PasswordNotSet]: "Password is not set after third party binding, click forget password to set.",
  [ErrorCodeEnum.AccountError]: "Account error.",
  [ErrorCodeEnum.SendEmailError]: "Failed to send email. Please try again",
  [ErrorCodeEnum.AITokenLimitExceeded]: "Monthly token limit exceeded. Please contact support@",
};
