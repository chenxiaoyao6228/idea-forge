#!/usr/bin/env tsx

/**
 * Test script for HTML import feature
 *
 * Tests importing HTML content and creating documents with TipTap extensions
 *
 * Usage: tsx scripts/test-html-import.ts <path-to-html-file>
 * Example: tsx scripts/test-html-import.ts scripts/test-document.html
 */

import * as fs from "fs";
import * as path from "path";

const API_URL = process.env.API_URL || "http://localhost:5000";

/**
 * Login user to get cookies
 */
async function loginUser(email: string, password: string) {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(`Login failed: ${response.status} ${response.statusText}`);
    }

    // Extract cookies from response headers
    const cookies = response.headers.get('set-cookie');
    if (!cookies) {
      throw new Error('No authentication cookies received from login');
    }

    return cookies;
  } catch (error: any) {
    console.error(`Failed to login user ${email}:`, error.message);
    throw error;
  }
}

async function importHtml(filePath: string, cookie: string) {
  console.log("📄 Reading HTML file:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("❌ File not found:", filePath);
    process.exit(1);
  }

  const html = fs.readFileSync(filePath, "utf-8");
  console.log(`✅ Read ${html.length} characters from file`);

  // Show a preview of the content
  const lines = html.split('\n').slice(0, 5);
  console.log(`\n📋 Preview (first ${lines.length} lines):`);
  lines.forEach(line => console.log(`   ${line}`));
  console.log(`   ...\n`);

  console.log("🚀 Sending import request to API...");
  console.log(`   URL: ${API_URL}/api/documents-import/html\n`);

  try {
    const response = await fetch(`${API_URL}/api/documents-import/html`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie,
      },
      body: JSON.stringify({
        html,
        workspaceId: "cmgulv3a10002c65maw2co6g1",
        subspaceId: "cmgulv43w001mc65m090wsbf8",
        title: "Test HTML Import"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API request failed:");
      console.error(`   Status: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      process.exit(1);
    }

    const result = await response.json();
    console.log("✅ Import successful!\n");
    console.log("📊 Statistics:");
    console.log(`   Document nodes: ${result.data?.nodeCount || 'N/A'}`);
    console.log(`   Document ID: ${result.data?.document?.id || 'N/A'}\n`);
    console.log("📋 Full Result:");
    console.log(JSON.stringify(result, null, 2));

  } catch (error: any) {
    console.error("❌ Failed to import HTML:");
    console.error(error);
    process.exit(1);
  }
}

// Get file path from command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.error("❌ Usage: tsx scripts/test-html-import.ts <path-to-html-file>");
  process.exit(1);
}

(async () => {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const cookie = await loginUser("user1@test.com", "Aa111111");
  await importHtml(absolutePath, cookie);
})();
