#!/usr/bin/env tsx

/**
 * Unified test script for document import feature
 *
 * Tests importing various file formats using the unified import API:
 * - Markdown (.md)
 * - HTML (.html)
 * - DOCX (.docx)
 * - CSV (.csv)
 *
 * Usage:
 *   # Test specific file
 *   tsx scripts/test-document-import.ts <path-to-file>
 *
 *   # Test all fixture files
 *   tsx scripts/test-document-import.ts --all
 *
 * Examples:
 *   tsx scripts/test-document-import.ts apps/api/test/fixtures/test-document.md
 *   tsx scripts/test-document-import.ts --all
 */

import * as fs from "fs";
import * as path from "path";

const API_URL = process.env.API_URL || "http://localhost:5000";

// Test fixtures directory
const FIXTURES_DIR = path.join(process.cwd(), "apps/api/test/fixtures");

// Test files configuration
const TEST_FILES = [
  {
    path: path.join(FIXTURES_DIR, "test-document.md"),
    mimeType: "text/markdown",
    title: "Test Markdown Import",
  },
  {
    path: path.join(FIXTURES_DIR, "test-document.html"),
    mimeType: "text/html",
    title: "Test HTML Import",
  },
  {
    path: path.join(FIXTURES_DIR, "file-sample_500kB.docx"),
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    title: "Test DOCX Import",
  },
  {
    path: path.join(FIXTURES_DIR, "test-data.csv"),
    mimeType: "text/csv",
    title: "Test CSV Import",
  },
];

// Default workspace and subspace IDs (update these with your actual IDs)
const DEFAULT_WORKSPACE_ID = "cmgulv3a10002c65maw2co6g1";
const DEFAULT_SUBSPACE_ID = "cmgulv43w001mc65m090wsbf8";

/**
 * Login user to get authentication cookies
 */
async function loginUser(email: string, password: string): Promise<string> {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    const cookies = response.headers.get("set-cookie");
    if (!cookies) {
      throw new Error("No authentication cookies received from login");
    }

    return cookies;
  } catch (error: any) {
    console.error(`Failed to login user ${email}:`, error.message);
    throw error;
  }
}

/**
 * Detect MIME type from file extension
 */
function detectMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".md": "text/markdown",
    ".markdown": "text/markdown",
    ".html": "text/html",
    ".htm": "text/html",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
  };

  return mimeTypes[ext] || "application/octet-stream";
}

/**
 * Import a document file
 */
async function importDocument(
  filePath: string,
  cookie: string,
  options?: {
    mimeType?: string;
    title?: string;
    workspaceId?: string;
    subspaceId?: string;
  }
) {
  const fileName = path.basename(filePath);
  const mimeType = options?.mimeType || detectMimeType(filePath);
  const title = options?.title || `Import: ${fileName}`;

  console.log("\n" + "=".repeat(80));
  console.log(`📄 Testing: ${fileName}`);
  console.log("=".repeat(80));
  console.log(`   File: ${filePath}`);
  console.log(`   MIME Type: ${mimeType}`);
  console.log(`   Title: ${title}\n`);

  if (!fs.existsSync(filePath)) {
    console.error("❌ File not found:", filePath);
    return { success: false, error: "File not found" };
  }

  // Read file content
  let content: string;
  const stats = fs.statSync(filePath);

  // For binary files (DOCX), read as base64
  if (mimeType.includes("wordprocessingml") || mimeType.includes("spreadsheetml")) {
    const buffer = fs.readFileSync(filePath);
    content = buffer.toString("base64");
    console.log(`✅ Read ${stats.size} bytes (binary, encoded as base64)`);
  } else {
    content = fs.readFileSync(filePath, "utf-8");
    console.log(`✅ Read ${content.length} characters from file`);
  }

  // Show preview for text files
  if (!mimeType.includes("wordprocessingml") && !mimeType.includes("spreadsheetml")) {
    const lines = content.split("\n").slice(0, 5);
    console.log(`\n📋 Preview (first ${lines.length} lines):`);
    lines.forEach((line) => console.log(`   ${line.substring(0, 100)}${line.length > 100 ? "..." : ""}`));
    console.log(`   ...\n`);
  }

  console.log("🚀 Sending import request to API...");
  console.log(`   URL: ${API_URL}/api/documents-import\n`);

  try {
    const response = await fetch(`${API_URL}/api/documents-import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        content,
        fileName,
        mimeType,
        workspaceId: options?.workspaceId || DEFAULT_WORKSPACE_ID,
        subspaceId: options?.subspaceId || DEFAULT_SUBSPACE_ID,
        title,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API request failed:");
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return { success: false, error: errorText };
    }

    const result = await response.json();
    console.log("✅ Import successful!\n");
    console.log("📊 Result:");
    console.log(`   Success: ${result.success}`);
    console.log(`   Document ID: ${result.document?.id || "N/A"}`);
    console.log(`   Document Title: ${result.document?.title || "N/A"}`);
    console.log(`   Created At: ${result.document?.createdAt || "N/A"}\n`);

    if (process.env.VERBOSE) {
      console.log("📋 Full Result:");
      console.log(JSON.stringify(result, null, 2));
    }

    return { success: true, result };
  } catch (error: any) {
    console.error("❌ Failed to import document:");
    console.error(error);
    return { success: false, error: error.message };
  }
}

/**
 * Test all fixture files
 */
async function testAllFixtures(cookie: string) {
  console.log("\n🧪 Testing all fixture files...\n");

  const results: Array<{ file: string; success: boolean }> = [];
  for (const testFile of TEST_FILES) {
    if (!fs.existsSync(testFile.path)) {
      console.log(`⏭️  Skipping ${path.basename(testFile.path)} (file not found)\n`);
      continue;
    }

    const result = await importDocument(testFile.path, cookie, {
      mimeType: testFile.mimeType,
      title: testFile.title,
    });

    results.push({
      file: path.basename(testFile.path),
      success: result.success,
    });

    // Add delay between tests to avoid overwhelming the server
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(80));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((r) => {
    const icon = r.success ? "✅" : "❌";
    console.log(`${icon} ${r.file}`);
  });

  console.log(`\nTotal: ${results.length} | Passed: ${successful} | Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error(`
❌ Usage:
  tsx scripts/test-document-import.ts <path-to-file>
  tsx scripts/test-document-import.ts --all

Examples:
  tsx scripts/test-document-import.ts apps/api/test/fixtures/test-document.md
  tsx scripts/test-document-import.ts --all
`);
    process.exit(1);
  }

  console.log("🔐 Authenticating...");
  const cookie = await loginUser("user1@test.com", "Aa111111");
  console.log("✅ Authentication successful\n");

  if (args[0] === "--all") {
    await testAllFixtures(cookie);
  } else {
    const filePath = path.resolve(process.cwd(), args[0]);
    await importDocument(filePath, cookie);
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
