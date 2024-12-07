export interface AuthResponse {
  type: AuthResponseType;
  data: AuthResponseData;
}

export type AuthResponseType =
  | "NEW_USER" // New user, account and connection automatically created
  | "EXISTING_USER" // Existing connected user direct login
  | "EMAIL_CONFLICT" // Logged in user binding new account
  | "ERROR"; // Other errors

export interface LoginResponseData {
  user?: {
    id: number;
    email?: string;
    displayName?: string;
    imageUrl?: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

export interface AuthResponseData extends LoginResponseData {
  provider?: string;
  error?: {
    code: string;
    message: string;
  };
}
