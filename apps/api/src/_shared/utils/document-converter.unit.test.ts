import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { convertToTiptapJSON, markdownToTiptapJSON, htmlToTiptapJSON, docxToTiptapJSON, csvToTiptapJSON, FileImportError } from "./document-converter";

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, "../../../test/fixtures");

describe("Document Converter", () => {
  describe("FileImportError", () => {
    it("should create a custom error with correct name", () => {
      const error = new FileImportError("Test error");
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("FileImportError");
      expect(error.message).toBe("Test error");
    });
  });

  describe("markdownToTiptapJSON", () => {
    it("should convert simple markdown to TipTap JSON", async () => {
      const markdown = "# Hello World\n\nThis is a **test**.";
      const result = await markdownToTiptapJSON(markdown);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it("should handle markdown with GFM features (tables)", async () => {
      const markdown = `
| Name | Age |
|------|-----|
| Alice | 30 |
| Bob | 25 |
`;
      const result = await markdownToTiptapJSON(markdown);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
      expect(result.content).toBeDefined();
    });

    it("should handle markdown with task lists", async () => {
      const markdown = `
- [x] Completed task
- [ ] Pending task
`;
      const result = await markdownToTiptapJSON(markdown);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should handle markdown from file fixture", async () => {
      const fixturePath = path.join(FIXTURES_DIR, "test-document.md");
      if (!fs.existsSync(fixturePath)) {
        console.warn(`Fixture not found: ${fixturePath}, skipping test`);
        return;
      }

      const markdown = fs.readFileSync(fixturePath, "utf-8");
      const result = await markdownToTiptapJSON(markdown);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle buffer input", async () => {
      const markdown = "# Test";
      const buffer = Buffer.from(markdown, "utf-8");
      const result = await markdownToTiptapJSON(buffer);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });
  });

  describe("htmlToTiptapJSON", () => {
    it("should convert simple HTML to TipTap JSON", async () => {
      const html = "<h1>Hello World</h1><p>This is a <strong>test</strong>.</p>";
      const result = await htmlToTiptapJSON(html);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it("should handle HTML with lists", async () => {
      const html = `
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
`;
      const result = await htmlToTiptapJSON(html);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should handle HTML from file fixture", async () => {
      const fixturePath = path.join(FIXTURES_DIR, "test-document.html");
      if (!fs.existsSync(fixturePath)) {
        console.warn(`Fixture not found: ${fixturePath}, skipping test`);
        return;
      }

      const html = fs.readFileSync(fixturePath, "utf-8");
      const result = await htmlToTiptapJSON(html);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });

    it("should handle buffer input", async () => {
      const html = "<h1>Test</h1>";
      const buffer = Buffer.from(html, "utf-8");
      const result = await htmlToTiptapJSON(buffer);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });
  });

  describe("csvToTiptapJSON", () => {
    it("should convert simple CSV to TipTap JSON", async () => {
      const csv = `Name,Email,Age
Alice,alice@test.com,30
Bob,bob@test.com,25`;

      const result = await csvToTiptapJSON(csv);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
      expect(result.content).toBeDefined();
    });

    it("should handle CSV with semicolon delimiter", async () => {
      const csv = `Name;Email;Age
Alice;alice@test.com;30
Bob;bob@test.com;25`;

      const result = await csvToTiptapJSON(csv);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should handle CSV with tab delimiter", async () => {
      const csv = `Name\tEmail\tAge
Alice\talice@test.com\t30
Bob\tbob@test.com\t25`;

      const result = await csvToTiptapJSON(csv);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should handle CSV from file fixture", async () => {
      const fixturePath = path.join(FIXTURES_DIR, "test-data.csv");
      if (!fs.existsSync(fixturePath)) {
        console.warn(`Fixture not found: ${fixturePath}, skipping test`);
        return;
      }

      const csv = fs.readFileSync(fixturePath, "utf-8");
      const result = await csvToTiptapJSON(csv);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
      expect(result.content).toBeDefined();
    });

    it("should handle empty CSV", async () => {
      const csv = "";
      const result = await csvToTiptapJSON(csv);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should handle buffer input", async () => {
      const csv = "Name,Age\nAlice,30";
      const buffer = Buffer.from(csv, "utf-8");
      const result = await csvToTiptapJSON(buffer);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });
  });

  describe("docxToTiptapJSON", () => {
    it("should accept base64-encoded string input", async () => {
      const fixturePath = path.join(FIXTURES_DIR, "file-sample_500kB.docx");
      if (!fs.existsSync(fixturePath)) {
        console.warn(`Fixture not found: ${fixturePath}, skipping test`);
        return;
      }

      // Test with base64-encoded string (simulates HTTP/JSON transport)
      const buffer = fs.readFileSync(fixturePath);
      const base64String = buffer.toString("base64");
      const result = await docxToTiptapJSON(base64String);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
      expect(result.content).toBeDefined();
    });

    it("should convert DOCX from file fixture (Buffer)", async () => {
      const fixturePath = path.join(FIXTURES_DIR, "file-sample_500kB.docx");
      if (!fs.existsSync(fixturePath)) {
        console.warn(`Fixture not found: ${fixturePath}, skipping test`);
        return;
      }

      const buffer = fs.readFileSync(fixturePath);
      const result = await docxToTiptapJSON(buffer);

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  describe("convertToTiptapJSON (unified interface)", () => {
    it("should convert markdown based on mime type", async () => {
      const content = "# Test";
      const result = await convertToTiptapJSON(content, "test.md", "text/markdown");

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should convert markdown based on file extension", async () => {
      const content = "# Test";
      const result = await convertToTiptapJSON(content, "test.md", "unknown/type");

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should convert HTML based on mime type", async () => {
      const content = "<h1>Test</h1>";
      const result = await convertToTiptapJSON(content, "test.html", "text/html");

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should convert HTML based on file extension", async () => {
      const content = "<h1>Test</h1>";
      const result = await convertToTiptapJSON(content, "test.html", "unknown/type");

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should convert CSV based on mime type", async () => {
      const content = "Name,Age\nAlice,30";
      const result = await convertToTiptapJSON(content, "test.csv", "text/csv");

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should convert CSV based on file extension", async () => {
      const content = "Name,Age\nAlice,30";
      const result = await convertToTiptapJSON(content, "test.csv", "unknown/type");

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should throw error for unsupported file type", async () => {
      const content = "some content";

      await expect(convertToTiptapJSON(content, "test.unknown", "unknown/type")).rejects.toThrow(FileImportError);
    });

    it("should handle .htm extension for HTML files", async () => {
      const content = "<h1>Test</h1>";
      const result = await convertToTiptapJSON(content, "test.htm", "unknown/type");

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });

    it("should handle .markdown extension", async () => {
      const content = "# Test";
      const result = await convertToTiptapJSON(content, "test.markdown", "unknown/type");

      expect(result).toBeDefined();
      expect(result.type).toBe("doc");
    });
  });

  describe("Real fixture files integration", () => {
    const fixtures = [
      { file: "test-document.md", mimeType: "text/markdown" },
      { file: "test-document.html", mimeType: "text/html" },
      { file: "test-data.csv", mimeType: "text/csv" },
      { file: "file-sample_500kB.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    ];

    fixtures.forEach(({ file, mimeType }) => {
      it(`should convert ${file} successfully`, async () => {
        const fixturePath = path.join(FIXTURES_DIR, file);

        if (!fs.existsSync(fixturePath)) {
          console.warn(`Fixture not found: ${fixturePath}, skipping test`);
          return;
        }

        // Read file based on type (binary vs text)
        const content = mimeType.includes("wordprocessingml") ? fs.readFileSync(fixturePath) : fs.readFileSync(fixturePath, "utf-8");

        const result = await convertToTiptapJSON(content, file, mimeType);

        expect(result).toBeDefined();
        expect(result.type).toBe("doc");
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);

        // Additional validation: ensure content is not empty (except for CSV which might be)
        if (!file.endsWith(".csv")) {
          expect(result.content.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
