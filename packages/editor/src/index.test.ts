import { describe, expect, it } from "vitest";
import { version, coreExtensions } from "./index";

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
});
