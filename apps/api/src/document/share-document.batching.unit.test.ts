import { describe, it, expect, beforeEach } from "vitest";
import { EventBatcher } from "@/_shared/queues/helpers/event-batcher";

describe("Permission Event Batching Integration", () => {
  beforeEach(() => {
    EventBatcher.resetSequence();
  });

  describe("Batching large permission changes", () => {
    it("should batch 100 child documents into 2 events when sharing parent", () => {
      // Simulate sharing a parent document with 100 children
      const parentDocId = "parent-doc-123";
      const childDocuments = Array.from({ length: 100 }, (_, i) => ({
        docId: `child-doc-${i}`,
        oldPermission: null,
        newPermission: "edit" as const,
      }));

      // Batch the affected documents
      const batches = EventBatcher.batchDocuments(childDocuments);

      // Verify batching behavior
      expect(batches).toHaveLength(2);
      expect(batches[0].data).toHaveLength(50);
      expect(batches[1].data).toHaveLength(50);

      // Verify metadata for client ordering
      expect(batches[0].batchSequence).toBe(1);
      expect(batches[0].batchIndex).toBe(0);
      expect(batches[0].totalBatches).toBe(2);

      expect(batches[1].batchSequence).toBe(2);
      expect(batches[1].batchIndex).toBe(1);
      expect(batches[1].totalBatches).toBe(2);

      // Simulate publishing batched events
      const events = batches.map((batch) => ({
        eventType: "PERMISSION_INHERITANCE_CHANGED",
        data: {
          batchSequence: batch.batchSequence,
          batchIndex: batch.batchIndex,
          totalBatches: batch.totalBatches,
          affectedDocuments: batch.data,
          affectedUserIds: ["user-123"],
          changeType: "added" as const,
          parentDocId,
          parentDocTitle: "Parent Document",
        },
      }));

      expect(events).toHaveLength(2);
      expect(events[0].data.affectedDocuments).toHaveLength(50);
      expect(events[1].data.affectedDocuments).toHaveLength(50);
    });

    it("should handle edge case: 150 documents creates 3 batches", () => {
      const documents = Array.from({ length: 150 }, (_, i) => ({
        docId: `doc-${i}`,
        permission: "edit" as const,
      }));

      const batches = EventBatcher.batchDocuments(documents);

      expect(batches).toHaveLength(3);
      expect(batches[0].data).toHaveLength(50);
      expect(batches[1].data).toHaveLength(50);
      expect(batches[2].data).toHaveLength(50);

      // All batches should have correct totalBatches
      expect(batches[0].totalBatches).toBe(3);
      expect(batches[1].totalBatches).toBe(3);
      expect(batches[2].totalBatches).toBe(3);
    });

    it("should handle guest permission inheritance after acceptance", () => {
      // Guest accepts invitation and gains access to 75 child documents
      const newlyAccessibleDocIds = Array.from({ length: 75 }, (_, i) => `doc-${i}`);

      const batches = EventBatcher.batchDocuments(newlyAccessibleDocIds.map((docId) => ({ docId })));

      expect(batches).toHaveLength(2);
      expect(batches[0].data).toHaveLength(50);
      expect(batches[1].data).toHaveLength(25);

      // Simulate GUEST_PERMISSION_INHERITED events
      const events = batches.map((batch) => ({
        eventType: "GUEST_PERMISSION_INHERITED",
        data: {
          guestId: "guest-123",
          userId: "user-456",
          batchSequence: batch.batchSequence,
          batchIndex: batch.batchIndex,
          totalBatches: batch.totalBatches,
          newlyAccessibleDocIds: batch.data.map((d) => d.docId),
        },
      }));

      expect(events).toHaveLength(2);
      expect(events[0].data.newlyAccessibleDocIds).toHaveLength(50);
      expect(events[1].data.newlyAccessibleDocIds).toHaveLength(25);
    });

    it("should assign sequential sequence numbers across multiple batching operations", () => {
      // First operation: share with 100 docs
      const batch1 = EventBatcher.batchDocuments(Array.from({ length: 100 }, (_, i) => ({ id: i })));

      // Second operation: another share with 50 docs
      const batch2 = EventBatcher.batchDocuments(Array.from({ length: 50 }, (_, i) => ({ id: i + 100 })));

      // Sequences should continue incrementing
      expect(batch1[0].batchSequence).toBe(1);
      expect(batch1[1].batchSequence).toBe(2);
      expect(batch2[0].batchSequence).toBe(3);
    });
  });

  describe("Event payload structure", () => {
    it("should create correct PERMISSION_INHERITANCE_CHANGED payload with batch metadata", () => {
      const affectedDocuments = Array.from({ length: 75 }, (_, i) => ({
        docId: `doc-${i}`,
        oldPermission: null as const,
        newPermission: "edit" as const,
      }));

      const batches = EventBatcher.batchDocuments(affectedDocuments);
      const firstBatch = batches[0];

      const payload = {
        batchSequence: firstBatch.batchSequence,
        batchIndex: firstBatch.batchIndex,
        totalBatches: firstBatch.totalBatches,
        affectedDocuments: firstBatch.data,
        affectedUserIds: ["user1", "user2"],
        changeType: "added" as const,
        parentDocId: "parent-123",
        parentDocTitle: "Parent Document",
      };

      // Verify structure
      expect(payload).toHaveProperty("batchSequence");
      expect(payload).toHaveProperty("batchIndex");
      expect(payload).toHaveProperty("totalBatches");
      expect(payload.affectedDocuments).toHaveLength(50);
      expect(payload.batchSequence).toBe(1);
      expect(payload.batchIndex).toBe(0);
      expect(payload.totalBatches).toBe(2);
    });
  });
});
