#!/usr/bin/env tsx

/**
 * Test script for markdown import feature
 *
 * Tests all core extensions moved to @idea/editor:
 * - Node extensions: paragraph, blockquote, horizontal-rule, hard-break
 * - Mark extensions: bold, italic, strike, underline, code, link, subscript, superscript
 * - List extensions: bullet-list, ordered-list, list-item, task-list, task-item
 *
 * Usage: tsx scripts/test-markdown-import.ts <path-to-markdown-file>
 * Example: tsx scripts/test-markdown-import.ts scripts/test-document.md
 */

import * as fs from "fs";
import * as path from "path";

const API_URL = process.env.API_URL || "http://localhost:5000";

async function importMarkdown(filePath: string) {
  console.log("📄 Reading markdown file:", filePath);

  if (!fs.existsSync(filePath)) {
    console.error("❌ File not found:", filePath);
    process.exit(1);
  }

  const markdown = fs.readFileSync(filePath, "utf-8");
  console.log(`✅ Read ${markdown.length} characters from file`);

  // Show a preview of the content
  const lines = markdown.split('\n').slice(0, 5);
  console.log(`\n📋 Preview (first ${lines.length} lines):`);
  lines.forEach(line => console.log(`   ${line}`));
  console.log(`   ...\n`);

  console.log("🚀 Sending import request to API...");
  console.log(`   URL: ${API_URL}/api/documents-import/markdown\n`);

  try {
    const response = await fetch(`${API_URL}/api/documents-import/markdown`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ markdown }),
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
    console.log(`   Document nodes: ${result.nodeCount || 'N/A'}`);
    console.log(`   Document ID: ${result.documentId || result.id || 'N/A'}\n`);
    console.log("📋 Full Result:");
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("❌ Failed to import markdown:");
    console.error(error);
    process.exit(1);
  }
}

// Get file path from command line argument
const filePath = process.argv[2];

if (!filePath) {
  console.error("❌ Usage: tsx scripts/test-markdown-import.ts <path-to-markdown-file>");
  process.exit(1);
}

const absolutePath = path.resolve(process.cwd(), filePath);
importMarkdown(absolutePath);
