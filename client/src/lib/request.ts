import axios, { AxiosRequestConfig } from "axios";
import useUserStore from "@/stores/user";
import { RESPONSE_SUCCESS_CODE } from "@api/_shared/constants/api-response-constant";

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type RequestConfig = Omit<AxiosRequestConfig, "url" | "data" | "method" | "params">;

export const commonHttpStatusCode = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

const REQUEST_TIMEOUT = 1000 * 60; // 1 minute

const request = axios.create({
  baseURL: window.location.origin,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Handle token refresh in response interceptor
request.interceptors.response.use(
  (response) => {
    if (response.status < 200 || response.status >= 300 || !response.data || response.data.statusCode !== RESPONSE_SUCCESS_CODE) {
      // Let business logic handle the error
      return Promise.reject(response.data);
    }

    return response.data.data;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === commonHttpStatusCode.UNAUTHORIZED && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Call /api/auth/refresh directly, no need to manually pass refreshToken
        // as server will read it from cookies
        const res = await axios.post("/api/auth/refresh", null, {
          withCredentials: true, // Ensure cookies are sent and received
        });

        if (res.data) {
          // No need to manually set tokens as server handles via cookies
          return request(originalRequest);
        }
      } catch (err) {
        console.error("refresh token failed", err);
        // Clear user info and redirect to login on refresh token failure
        useUserStore.getState().logout();
        const currentPath = window.location.pathname;
        window.location.href = `/login?redirectTo=${encodeURIComponent(currentPath)}`;
      }
    }
    return Promise.reject(error);
  },
);

export default request;
