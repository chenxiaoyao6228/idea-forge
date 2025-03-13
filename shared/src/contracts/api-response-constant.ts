export const RESPONSE_SUCCESS_CODE = 0;

export const RESPONSE_SUCCESS_MSG = "success";

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
  InvalidProvider = 1006,
  PasswordNotSet = 1007,
  AccountError = 1008, // Account error
  SendEmailError = 1009, // Send email error

  AITokenLimitExceeded = 1100,

  // Document related errors (using 4000 range for documents)
  DocumentNotFound = 4001,
  DocumentAccessDenied = 4002,
  DocumentAlreadyExists = 4003,
  DocumentCircularReference = 4004,
  DocumentCoverNotFound = 4005,

  // Document sharing related errors (using 4100 range for document sharing)
  CannotShareWithYourself = 4101,
  DocumentAlreadyShared = 4102,
  DocumentShareNotFound = 4103,
  InvalidSharePermission = 4104,

  // File Storage related errors (using 5000 range for file operations)
  FileNotFound = 5001,
  FileUploadFailed = 5002,
  FileDeleteFailed = 5003,
  FileMoveFailed = 5004,
  FileOperationFailed = 5005,
  FileSizeLimitExceeded = 5006,
  FileTypeNotAllowed = 5007,
  FileAccessDenied = 5008,
}

export type ErrorCodeMsg = Record<ErrorCodeEnum, string>;

// 🚧 remember to update translate in api/locales/en.json
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

  // Document related messages
  [ErrorCodeEnum.DocumentNotFound]: "The specified document could not be found.",
  [ErrorCodeEnum.DocumentAccessDenied]: "You do not have access to this document.",
  [ErrorCodeEnum.DocumentAlreadyExists]: "A document with this name already exists.",
  [ErrorCodeEnum.DocumentCircularReference]: "Cannot move a document to its descendant",
  [ErrorCodeEnum.DocumentCoverNotFound]: "The specified document cover could not be found.",

  // Document sharing related messages
  [ErrorCodeEnum.CannotShareWithYourself]: "You cannot share a document with yourself.",
  [ErrorCodeEnum.DocumentAlreadyShared]: "This document has already been shared with this user.",
  [ErrorCodeEnum.DocumentShareNotFound]: "The specified document share could not be found.",
  [ErrorCodeEnum.InvalidSharePermission]: "Invalid share permission level.",

  // File Storage related messages
  [ErrorCodeEnum.FileNotFound]: "The specified file could not be found.",
  [ErrorCodeEnum.FileUploadFailed]: "Failed to upload the file. Please try again.",
  [ErrorCodeEnum.FileDeleteFailed]: "Failed to delete the file. Please try again.",
  [ErrorCodeEnum.FileMoveFailed]: "Failed to move the file to the new location.",
  [ErrorCodeEnum.FileOperationFailed]: "File operation failed. Please try again.",
  [ErrorCodeEnum.FileSizeLimitExceeded]: "File size exceeds the maximum allowed limit.",
  [ErrorCodeEnum.FileTypeNotAllowed]: "This file type is not allowed.",
  [ErrorCodeEnum.FileAccessDenied]: "You do not have permission to access this file.",
};
