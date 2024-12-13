import { Response } from "express";

export interface TokenCookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
}

export const setAuthCookies = (res: Response, accessToken?: string, refreshToken?: string, options: TokenCookieOptions = {}) => {
  const defaultOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    ...options,
  };

  if (accessToken) {
    res.cookie("accessToken", accessToken, defaultOptions);
  }

  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, defaultOptions);
  }
};
