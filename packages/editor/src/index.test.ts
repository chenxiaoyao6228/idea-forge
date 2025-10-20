import { describe, expect, it } from "vitest";
import { version, coreExtensions, createEditor, validateDocument, markdownToDoc, docToMarkdown } from "./index";

describe("@idea/editor", () => {
  describe("package exports", () => {
    it("should export version", () => {
      expect(version).toBe("0.1.0");
    });

    it("should export coreExtensions as empty array (placeholder)", () => {
      expect(coreExtensions).toEqual([]);
      expect(Array.isArray(coreExtensions)).toBe(true);
    });
  });

  describe("placeholder functions", () => {
    it("should have createEditor function", () => {
      expect(typeof createEditor).toBe("function");
    });

    it("should have validateDocument function", () => {
      expect(typeof validateDocument).toBe("function");
    });

    it("should have markdownToDoc function", () => {
      expect(typeof markdownToDoc).toBe("function");
    });

    it("should have docToMarkdown function", () => {
      expect(typeof docToMarkdown).toBe("function");
    });
  });
});
