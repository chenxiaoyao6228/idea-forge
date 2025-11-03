import { describe, expect, it } from "vitest";
import { extractDocumentIdFromPath, isValidDocumentId } from "../document-validators";

describe("document-validators", () => {
  describe("isValidDocumentId", () => {
    it("should return true for valid CUID", () => {
      const validCuid = "c123456789abcdef12345678";
      expect(isValidDocumentId(validCuid)).toBe(true);
    });

    it("should return true for valid CUID with only lowercase letters", () => {
      const validCuid = "cabcdefghijklmnopqrstuvwx";
      expect(isValidDocumentId(validCuid)).toBe(true);
    });

    it("should return true for valid CUID with only numbers", () => {
      const validCuid = "c123456789012345678901234";
      expect(isValidDocumentId(validCuid)).toBe(true);
    });

    it('should return false for string not starting with "c"', () => {
      const invalidCuid = "d123456789abcdef12345678";
      expect(isValidDocumentId(invalidCuid)).toBe(false);
    });

    it("should return false for string that is too short", () => {
      const invalidCuid = "c123";
      expect(isValidDocumentId(invalidCuid)).toBe(false);
    });

    it("should return false for string that is too long", () => {
      const invalidCuid = "c123456789abcdef123456789";
      expect(isValidDocumentId(invalidCuid)).toBe(false);
    });

    it("should return false for string with uppercase letters", () => {
      const invalidCuid = "c123456789ABCDEF12345678";
      expect(isValidDocumentId(invalidCuid)).toBe(false);
    });

    it("should return false for string with special characters", () => {
      const invalidCuid = "c123456789abcdef-2345678";
      expect(isValidDocumentId(invalidCuid)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidDocumentId("")).toBe(false);
    });

    it("should return false for null", () => {
      expect(isValidDocumentId(null as any)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValidDocumentId(undefined as any)).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(isValidDocumentId(123 as any)).toBe(false);
      expect(isValidDocumentId({} as any)).toBe(false);
      expect(isValidDocumentId([] as any)).toBe(false);
    });
  });

  describe("extractDocumentIdFromPath", () => {
    describe("Direct document ID pattern (/:docId)", () => {
      it("should extract valid document ID from direct path", () => {
        const path = "/c123456789abcdef12345678";
        const result = extractDocumentIdFromPath(path);
        expect(result).toBe("c123456789abcdef12345678");
      });

      it("should return null for invalid document ID in direct path", () => {
        const path = "/invalid-id";
        const result = extractDocumentIdFromPath(path);
        expect(result).toBeNull();
      });

      it("should return null for direct path with wrong prefix", () => {
        const path = "/d123456789abcdef12345678";
        const result = extractDocumentIdFromPath(path);
        expect(result).toBeNull();
      });
    });

    describe("Workspace document pattern (/workspace/:workspaceId/doc/:docId)", () => {
      it("should extract valid document ID from workspace path", () => {
        const path = "/workspace/cmgh1234567890123456789/doc/c123456789abcdef12345678";
        const result = extractDocumentIdFromPath(path);
        expect(result).toBe("c123456789abcdef12345678");
      });

      it("should extract valid document ID from workspace path with any workspace ID", () => {
        const path = "/workspace/any-workspace-id/doc/c123456789abcdef12345678";
        const result = extractDocumentIdFromPath(path);
        expect(result).toBe("c123456789abcdef12345678");
      });

      it("should return null for invalid document ID in workspace path", () => {
        const path = "/workspace/cmgh1234/doc/invalid-id";
        const result = extractDocumentIdFromPath(path);
        expect(result).toBeNull();
      });

      it("should return null for workspace path with wrong document ID prefix", () => {
        const path = "/workspace/cmgh1234/doc/d123456789abcdef12345678";
        const result = extractDocumentIdFromPath(path);
        expect(result).toBeNull();
      });
    });

    describe("Edge cases", () => {
      it("should return null for empty string", () => {
        expect(extractDocumentIdFromPath("")).toBeNull();
      });

      it("should return null for null", () => {
        expect(extractDocumentIdFromPath(null as any)).toBeNull();
      });

      it("should return null for undefined", () => {
        expect(extractDocumentIdFromPath(undefined as any)).toBeNull();
      });

      it("should return null for root path", () => {
        expect(extractDocumentIdFromPath("/")).toBeNull();
      });

      it("should return null for unrelated paths", () => {
        expect(extractDocumentIdFromPath("/api/documents")).toBeNull();
        expect(extractDocumentIdFromPath("/settings")).toBeNull();
        expect(extractDocumentIdFromPath("/public/token123")).toBeNull();
      });

      it("should return null for path with extra segments", () => {
        const path = "/c123456789abcdef12345678/extra";
        expect(extractDocumentIdFromPath(path)).toBeNull();
      });

      it("should return null for workspace path with extra segments", () => {
        const path = "/workspace/cmgh1234/doc/c123456789abcdef12345678/extra";
        expect(extractDocumentIdFromPath(path)).toBeNull();
      });
    });
  });
});
