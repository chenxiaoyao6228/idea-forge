import { describe, it, expect, beforeEach } from "vitest";
import { EventBatcher } from "./event-batcher";

describe("EventBatcher", () => {
  beforeEach(() => {
    // Reset sequence counter before each test
    EventBatcher.resetSequence();
  });

  describe("batchDocuments", () => {
    it("should split 100 documents into 2 batches of 50", () => {
      const documents = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      const batches = EventBatcher.batchDocuments(documents);

      expect(batches).toHaveLength(2);
      expect(batches[0].data).toHaveLength(50);
      expect(batches[1].data).toHaveLength(50);
      expect(batches[0].totalBatches).toBe(2);
      expect(batches[1].totalBatches).toBe(2);
    });

    it("should assign sequential sequence numbers", () => {
      const documents = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      const batches = EventBatcher.batchDocuments(documents);

      expect(batches[0].batchSequence).toBe(1);
      expect(batches[1].batchSequence).toBe(2);
    });

    it("should set correct batchIndex and totalBatches metadata", () => {
      const documents = Array.from({ length: 150 }, (_, i) => ({ id: i }));

      const batches = EventBatcher.batchDocuments(documents);

      expect(batches).toHaveLength(3);
      expect(batches[0].batchIndex).toBe(0);
      expect(batches[0].totalBatches).toBe(3);
      expect(batches[1].batchIndex).toBe(1);
      expect(batches[1].totalBatches).toBe(3);
      expect(batches[2].batchIndex).toBe(2);
      expect(batches[2].totalBatches).toBe(3);
    });

    it("should handle edge case: 0 documents", () => {
      const documents: any[] = [];

      const batches = EventBatcher.batchDocuments(documents);

      expect(batches).toHaveLength(0);
    });

    it("should handle edge case: 1 document", () => {
      const documents = [{ id: 1 }];

      const batches = EventBatcher.batchDocuments(documents);

      expect(batches).toHaveLength(1);
      expect(batches[0].data).toHaveLength(1);
      expect(batches[0].batchIndex).toBe(0);
      expect(batches[0].totalBatches).toBe(1);
      expect(batches[0].batchSequence).toBe(1);
    });

    it("should handle edge case: exactly 50 documents", () => {
      const documents = Array.from({ length: 50 }, (_, i) => ({ id: i }));

      const batches = EventBatcher.batchDocuments(documents);

      expect(batches).toHaveLength(1);
      expect(batches[0].data).toHaveLength(50);
      expect(batches[0].batchIndex).toBe(0);
      expect(batches[0].totalBatches).toBe(1);
    });

    it("should handle 51 documents (creates 2 batches)", () => {
      const documents = Array.from({ length: 51 }, (_, i) => ({ id: i }));

      const batches = EventBatcher.batchDocuments(documents);

      expect(batches).toHaveLength(2);
      expect(batches[0].data).toHaveLength(50);
      expect(batches[1].data).toHaveLength(1);
    });

    it("should preserve document data correctly", () => {
      const documents = [
        { docId: "doc1", permission: "edit" },
        { docId: "doc2", permission: "view" },
      ];

      const batches = EventBatcher.batchDocuments(documents);

      expect(batches[0].data[0]).toEqual({ docId: "doc1", permission: "edit" });
      expect(batches[0].data[1]).toEqual({ docId: "doc2", permission: "view" });
    });
  });

  describe("getNextSequence", () => {
    it("should return incrementing sequence numbers", () => {
      const seq1 = EventBatcher.getNextSequence();
      const seq2 = EventBatcher.getNextSequence();
      const seq3 = EventBatcher.getNextSequence();

      expect(seq1).toBe(1);
      expect(seq2).toBe(2);
      expect(seq3).toBe(3);
    });
  });

  describe("resetSequence", () => {
    it("should reset sequence counter to 0", () => {
      EventBatcher.getNextSequence(); // 1
      EventBatcher.getNextSequence(); // 2

      EventBatcher.resetSequence();

      const seq = EventBatcher.getNextSequence();
      expect(seq).toBe(1);
    });
  });
});
