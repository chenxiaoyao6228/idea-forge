export const RESPONSE_SUCCESS_CODE = 0;

export const RESPONSE_SUCCESS_MSG = "success";

export enum ErrorCodeEnum {
  UserAlreadyExists = "user_already_exists",
  UserNotActive = "user_not_active",
  RequestTooFrequent = "request_too_frequent",
  VerificationCodeInvalid = "verification_code_invalid",
  UserNotFound = "user_not_found",
  PasswordIncorrect = "password_incorrect",
  AuthenticationFailed = "authentication_failed",
  PermissionDenied = "permission_denied",
  InvalidRefreshToken = "invalid_refresh_token",

  // Password related errors
  CurrentPasswordIncorrect = "current_password_incorrect",
  PasswordTooWeak = "password_too_weak",
  SamePasswordNotAllowed = "same_password_not_allowed",

  // OAuth related
  InvalidTempId = "invalid_temp_id",
  UsernameAlreadyExists = "username_already_exists",
  InvalidProvider = "invalid_provider",
  PasswordNotSet = "password_not_set",
  AccountError = "account_error", // Account error
  SendEmailError = "send_email_error", // Send email error

  AITokenLimitExceeded = "ai_token_limit_exceeded",

  // Document related errors (using document prefix for documents)
  DocumentNotFound = "document_not_found",
  DocumentAccessDenied = "document_access_denied",
  DocumentAlreadyExists = "document_already_exists",
  DocumentCircularReference = "document_circular_reference",
  DocumentCoverNotFound = "document_cover_not_found",

  // Document sharing related errors (using document_share prefix for document sharing)
  CannotShareWithYourself = "cannot_share_with_yourself",
  DocumentAlreadyShared = "document_already_shared",
  DocumentShareNotFound = "document_share_not_found",
  InvalidSharePermission = "invalid_share_permission",

  // File Storage related errors (using file prefix for file operations)
  FileNotFound = "file_not_found",
  FileUploadFailed = "file_upload_failed",
  FileDeleteFailed = "file_delete_failed",
  FileMoveFailed = "file_move_failed",
  FileOperationFailed = "file_operation_failed",
  FileSizeLimitExceeded = "file_size_limit_exceeded",
  FileTypeNotAllowed = "file_type_not_allowed",
  FileAccessDenied = "file_access_denied",

  // Workspace
  WorkspaceNotFoundOrNotInWorkspace = "workspace_not_found_or_user_not_in_workspace",
  WorkspaceHasMembers = "workspace_has_members",
  UserAlreadyInWorkspace = "user_already_in_workspace",
  UserNotInWorkspace = "user_not_in_workspace",
  CannotRemoveLastOwner = "cannot_remove_last_owner",
  GuestNotFound = "guest_not_found",
  WorkspaceInvitationNotFound = "workspace_invitation_not_found",
  WorkspaceInvitationExpired = "workspace_invitation_expired",

  // Subspace related errors (using subspace prefix for subspaces)
  SubspaceNotFound = "subspace_not_found",
  SubspaceAdminRoleRequired = "subspace_admin_role_required",
  SubspaceAccessDenied = "subspace_access_denied",
  UserAlreadyInSubspace = "user_already_in_subspace",
  UserNotInSubspace = "user_not_in_subspace",
  CannotLeavePersonalSubspace = "cannot_leave_personal_subspace",
  CannotLeaveAsLastAdmin = "cannot_leave_as_last_admin",

  // Group related errors
  GroupNotFound = "group_not_found",

  // Star related errors
  StarNotFound = "STAR_NOT_FOUND",
  StarAlreadyExists = "STAR_ALREADY_EXISTS",
  DocNotFoundOrNoAccess = "DOC_NOT_FOUND_OR_NO_ACCESS",
  SubspaceNotFoundOrNoAccess = "SUBSPACE_NOT_FOUND_OR_NO_ACCESS",

  PermissionNotFound = "permission_not_found",
  ResourceNotFound = "resource_not_found",
  InternalServerError = "internal_server_error",
}
