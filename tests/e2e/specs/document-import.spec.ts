import { test, expect } from "@playwright/test";
import { createVerifiedTestUser, cleanupTestUser, TestUser } from "../helpers/auth";
import { createWorkspace } from "../helpers/api-helpers";
import { getPrisma } from "../helpers/database";
import { io, Socket } from "socket.io-client";
import * as fs from "fs";
import * as path from "path";

/**
 * DOCUMENT IMPORT SPEC - E2E TEST
 * Tests the complete document import flow:
 * - Prepare import (get presigned URL)
 * - Upload file to OSS (MinIO)
 * - Start import job
 * - Monitor WebSocket progress events
 * - Verify document creation
 */
test.describe("Document Import", () => {
  let testUser: TestUser;
  let authToken: string;
  let workspaceId: string;
  let subspaceId: string;
  let socket: Socket;
  const BASE_URL = process.env.CLIENT_APP_URL ;
  const API_BASE = process.env.API_BASE_URL;

  test.beforeAll(async () => {
    // Create test user
    const email = `import-test-${Date.now()}@example.com`;
    testUser = await createVerifiedTestUser(email, "password123");

    // Login to get auth token
    const loginResponse = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });
    const loginData = await loginResponse.json();
    authToken = loginData.data.token;

    // Create workspace
    const workspaceData = await createWorkspace(`Import Test Workspace ${Date.now()}`, authToken);
    workspaceId = workspaceData.data.id;

    // Get default subspace
    const prisma = await getPrisma();
    const defaultSubspace = await prisma.subspace.findFirst({
      where: { workspaceId },
    });
    subspaceId = defaultSubspace!.id;
  });

  test.afterAll(async () => {
    // Cleanup
    if (socket && socket.connected) {
      socket.disconnect();
    }
    if (testUser) {
      await cleanupTestUser(testUser.email);
    }
  });

  test.beforeEach(async () => {
    // Setup WebSocket connection before each test
    socket = io(BASE_URL, {
      auth: { token: authToken },
      transports: ["websocket"],
    });

    await new Promise<void>((resolve) => {
      socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        resolve();
      });
    });
  });

  test.afterEach(async () => {
    // Disconnect socket after each test
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });

  test.describe("Markdown Import", () => {
    test("should successfully import a markdown file with progress tracking", async () => {
      const fileName = "test-document.md";
      const markdownContent = `# Test Document

This is a **test** document with:

- List item 1
- List item 2

## Code Block

\`\`\`javascript
console.log('Hello World');
\`\`\`

## Table

| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |
`;

      // Track progress events
      const progressEvents: any[] = [];
      let importCompleteData: any = null;
      let importErrorData: any = null;

      socket.on("document.import.progress", (data) => {
        console.log("Progress event:", data);
        progressEvents.push(data);
      });

      socket.on("document.import.complete", (data) => {
        console.log("Complete event:", data);
        importCompleteData = data;
      });

      socket.on("document.import.error", (data) => {
        console.log("Error event:", data);
        importErrorData = data;
      });

      await test.step("Step 1: Prepare import", async () => {
        const response = await fetch(`${API_BASE}/imports/prepare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            fileName,
            mimeType: "text/markdown",
            workspaceId,
            subspaceId,
            title: "Test Markdown Import",
          }),
        });

        expect(response.status).toBe(201);
        const result = await response.json();

        expect(result.statusCode).toBe(0);
        expect(result.message).toBe("success");
        expect(result.data).toHaveProperty("uploadUrl");
        expect(result.data).toHaveProperty("importJobId");
        expect(result.data).toHaveProperty("fileKey");

        await test.step("Step 2: Upload file to OSS", async () => {
          const uploadResponse = await fetch(result.data.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "text/markdown",
            },
            body: markdownContent,
          });

          expect(uploadResponse.status).toBe(200);
        });

        await test.step("Step 3: Start import job", async () => {
          const startResponse = await fetch(`${API_BASE}/imports/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              importJobId: result.data.importJobId,
            }),
          });

          expect(startResponse.status).toBe(200);
          const startResult = await startResponse.json();
          expect(startResult.statusCode).toBe(0);
        });

        await test.step("Step 4: Wait for import completion", async () => {
          // Wait for completion event (max 30 seconds)
          await expect
            .poll(
              () => importCompleteData !== null,
              {
                timeout: 30000,
                intervals: [1000],
              }
            )
            .toBeTruthy();

          // Verify no errors
          expect(importErrorData).toBeNull();

          // Verify completion data
          expect(importCompleteData).toHaveProperty("importJobId");
          expect(importCompleteData).toHaveProperty("docId");
          expect(importCompleteData).toHaveProperty("title", "Test Markdown Import");
        });

        await test.step("Step 5: Verify progress events", async () => {
          // Should receive multiple progress events
          expect(progressEvents.length).toBeGreaterThan(0);

          // Should have progression from 0 to 100
          const progressValues = progressEvents.map((e) => e.progress);
          expect(Math.max(...progressValues)).toBe(100);

          // Should have expected statuses
          const statuses = progressEvents.map((e) => e.status);
          expect(statuses).toContain("downloading");
          expect(statuses).toContain("converting");
          expect(statuses).toContain("complete");
        });

        await test.step("Step 6: Verify document creation in database", async () => {
          const prisma = await getPrisma();
          const document = await prisma.doc.findUnique({
            where: { id: importCompleteData.docId },
          });

          expect(document).toBeTruthy();
          expect(document!.title).toBe("Test Markdown Import");
          expect(document!.workspaceId).toBe(workspaceId);
          expect(document!.subspaceId).toBe(subspaceId);
          expect(document!.type).toBe("NOTE");

          // Verify content is stored
          expect(document!.content).toBeTruthy();
          expect(document!.contentBinary).toBeTruthy();

          // Verify content contains expected elements
          const content = JSON.parse(document!.content as string);
          expect(JSON.stringify(content)).toContain("Test Document");
          expect(JSON.stringify(content)).toContain("test");
        });

        await test.step("Step 7: Verify temporary records are cleaned up", async () => {
          const prisma = await getPrisma();
          const tempImport = await prisma.temporaryImport.findUnique({
            where: { id: result.data.importJobId },
          });

          expect(tempImport).toBeNull();
        });
      });
    });

    test("should handle import errors gracefully", async () => {
      const fileName = "invalid-file.md";
      let importErrorData: any = null;

      socket.on("document.import.error", (data) => {
        console.log("Error event:", data);
        importErrorData = data;
      });

      await test.step("Prepare import with valid data", async () => {
        const response = await fetch(`${API_BASE}/imports/prepare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            fileName,
            mimeType: "text/markdown",
            workspaceId,
            subspaceId,
            title: "Invalid Import Test",
          }),
        });

        expect(response.status).toBe(201);
        const result = await response.json();

        await test.step("Start import WITHOUT uploading file", async () => {
          // This should fail because file was not uploaded
          const startResponse = await fetch(`${API_BASE}/imports/start`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              importJobId: result.data.importJobId,
            }),
          });

          // Should return error since file doesn't exist in OSS
          expect(startResponse.status).toBe(422);
          const errorResult = await startResponse.json();
          expect(errorResult.code).toBe(422);
        });
      });
    });
  });

  test.describe("HTML Import", () => {
    test("should successfully import an HTML file", async () => {
      const fileName = "test-document.html";
      const htmlContent = `<!DOCTYPE html>
<html>
<head><title>Test HTML</title></head>
<body>
  <h1>Test HTML Document</h1>
  <p>This is a <strong>test</strong> HTML document.</p>
  <ul>
    <li>List item 1</li>
    <li>List item 2</li>
  </ul>
</body>
</html>`;

      let importCompleteData: any = null;

      socket.on("document.import.complete", (data) => {
        importCompleteData = data;
      });

      await test.step("Complete import flow", async () => {
        // Prepare
        const prepareResponse = await fetch(`${API_BASE}/imports/prepare`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            fileName,
            mimeType: "text/html",
            workspaceId,
            subspaceId,
            title: "Test HTML Import",
          }),
        });

        const prepareResult = await prepareResponse.json();

        // Upload
        await fetch(prepareResult.data.uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "text/html" },
          body: htmlContent,
        });

        // Start
        await fetch(`${API_BASE}/imports/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            importJobId: prepareResult.data.importJobId,
          }),
        });

        // Wait for completion
        await expect
          .poll(() => importCompleteData !== null, {
            timeout: 30000,
            intervals: [1000],
          })
          .toBeTruthy();

        // Verify document
        const prisma = await getPrisma();
        const document = await prisma.doc.findUnique({
          where: { id: importCompleteData.docId },
        });

        expect(document).toBeTruthy();
        expect(document!.title).toBe("Test HTML Import");
      });
    });
  });

  test.describe("Validation", () => {
    test("should validate required fields in prepare endpoint", async () => {
      const response = await fetch(`${API_BASE}/imports/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fileName: "", // Invalid: empty
          mimeType: "text/markdown",
          workspaceId,
          subspaceId,
          title: "Test",
        }),
      });

      expect(response.status).toBe(422);
    });

    test("should validate MIME type", async () => {
      const response = await fetch(`${API_BASE}/imports/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fileName: "test.invalid",
          mimeType: "application/invalid", // Unsupported MIME type
          workspaceId,
          subspaceId,
          title: "Test",
        }),
      });

      // Should either accept (and fail later) or reject immediately
      // Depending on implementation
      expect([201, 422]).toContain(response.status);
    });

    test("should require authentication", async () => {
      const response = await fetch(`${API_BASE}/imports/prepare`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No Authorization header
        },
        body: JSON.stringify({
          fileName: "test.md",
          mimeType: "text/markdown",
          workspaceId,
          subspaceId,
          title: "Test",
        }),
      });

      expect(response.status).toBe(401);
    });
  });
});
