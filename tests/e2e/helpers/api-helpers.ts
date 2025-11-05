import { APIRequestContext } from "@playwright/test";

const BASE_URL = process.env.API_BASE_URL;

export async function createUser(email?: string, password?: string) {
  const response = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email || `test${Date.now()}@example.com`,
      password: password || "testpassword123",
      displayName: "Test User",
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create user: ${response.status}`);
  }

  return await response.json();
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Failed to login: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

export async function createWorkspace(name?: string, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/api/workspaces`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: name || `Test Workspace ${Date.now()}`,
      description: "Test workspace for E2E tests",
      avatar: "",
      type: "TEAM",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create workspace: ${response.status} - ${errorBody}`);
  }

  return await response.json();
}

export async function createDocument(data: any, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/api/documents`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create document: ${response.status}`);
  }

  return await response.json();
}

export async function createDocumentPermission(data: any, token?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}/api/permissions/users`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create document permission: ${response.status}`);
  }

  return await response.json();
}
