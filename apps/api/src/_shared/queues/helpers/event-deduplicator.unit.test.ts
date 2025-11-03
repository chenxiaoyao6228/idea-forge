import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventDeduplicator } from "./event-deduplicator";
import { RedisService } from "@/_shared/database/redis/redis.service";

// Mock RedisService
const mockRedisService = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
} as unknown as RedisService;

describe("EventDeduplicator", () => {
  let deduplicator: EventDeduplicator;
  let publishFn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    deduplicator = new EventDeduplicator(mockRedisService);
    publishFn = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    deduplicator.clearPending();
  });

  describe("deduplicate", () => {
    it("should publish event after 100ms delay for new event", async () => {
      const event = { userId: "user1", docId: "doc1", permission: "edit" };
      (mockRedisService.get as any).mockResolvedValue(null);

      await deduplicator.deduplicate("PERMISSION_UPDATED", event, publishFn);

      // Event should not be published immediately
      expect(publishFn).not.toHaveBeenCalled();

      // Advance timers by 100ms
      vi.advanceTimersByTime(100);

      // Wait for async operations
      await vi.runAllTimersAsync();

      expect(publishFn).toHaveBeenCalledWith(event);
      expect(mockRedisService.del).toHaveBeenCalledWith("event:dedup:PERMISSION_UPDATED:user1:doc1");
    });

    it("should merge duplicate events within 5-second window", async () => {
      const event1 = {
        userId: "user1",
        docId: "doc1",
        affectedDocuments: [{ docId: "child1", permission: "edit" }],
      };
      const event2 = {
        userId: "user1",
        docId: "doc1",
        affectedDocuments: [{ docId: "child2", permission: "view" }],
      };

      // First event - no existing data
      (mockRedisService.get as any).mockResolvedValueOnce(null);

      await deduplicator.deduplicate("PERMISSION_INHERITANCE_CHANGED", event1, publishFn);

      // Second event - existing data
      (mockRedisService.get as any).mockResolvedValueOnce(JSON.stringify(event1));

      await deduplicator.deduplicate("PERMISSION_INHERITANCE_CHANGED", event2, publishFn);

      // Advance timers to trigger publish
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();

      // Should publish merged event
      expect(publishFn).toHaveBeenCalledTimes(1);
      const publishedEvent = publishFn.mock.calls[0][0];
      expect(publishedEvent.affectedDocuments).toHaveLength(2);
      expect(publishedEvent.affectedDocuments).toContainEqual({ docId: "child1", permission: "edit" });
      expect(publishedEvent.affectedDocuments).toContainEqual({ docId: "child2", permission: "view" });
    });

    it("should union merge affectedDocuments arrays", async () => {
      const existing = {
        userId: "user1",
        docId: "doc1",
        affectedDocuments: [
          { docId: "doc1", permission: "edit" },
          { docId: "doc2", permission: "view" },
        ],
      };
      const incoming = {
        userId: "user1",
        docId: "doc1",
        affectedDocuments: [
          { docId: "doc2", permission: "edit" }, // Should overwrite existing doc2
          { docId: "doc3", permission: "comment" },
        ],
      };

      (mockRedisService.get as any).mockResolvedValueOnce(JSON.stringify(existing));

      await deduplicator.deduplicate("PERMISSION_INHERITANCE_CHANGED", incoming, publishFn);

      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();

      const published = publishFn.mock.calls[0][0];
      expect(published.affectedDocuments).toHaveLength(3);
      expect(published.affectedDocuments).toContainEqual({ docId: "doc1", permission: "edit" });
      expect(published.affectedDocuments).toContainEqual({ docId: "doc2", permission: "edit" }); // Updated
      expect(published.affectedDocuments).toContainEqual({ docId: "doc3", permission: "comment" });
    });

    it("should reset TTL to 5 seconds on each duplicate", async () => {
      const event1 = { userId: "user1", docId: "doc1", permission: "edit" };
      const event2 = { userId: "user1", docId: "doc1", permission: "view" };

      (mockRedisService.get as any).mockResolvedValueOnce(null);
      await deduplicator.deduplicate("PERMISSION_UPDATED", event1, publishFn);

      expect(mockRedisService.setex).toHaveBeenCalledWith(
        "event:dedup:PERMISSION_UPDATED:user1:doc1",
        5, // 5 seconds
        JSON.stringify(event1),
      );

      (mockRedisService.get as any).mockResolvedValueOnce(JSON.stringify(event1));
      await deduplicator.deduplicate("PERMISSION_UPDATED", event2, publishFn);

      // TTL should be reset again
      expect(mockRedisService.setex).toHaveBeenCalledWith("event:dedup:PERMISSION_UPDATED:user1:doc1", 5, JSON.stringify(event2));
    });

    it("should handle multiple concurrent dedup keys", async () => {
      const event1 = { userId: "user1", docId: "doc1", permission: "edit" };
      const event2 = { userId: "user2", docId: "doc2", permission: "view" };

      (mockRedisService.get as any).mockResolvedValue(null);

      await deduplicator.deduplicate("PERMISSION_UPDATED", event1, publishFn);
      await deduplicator.deduplicate("PERMISSION_UPDATED", event2, publishFn);

      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();

      expect(publishFn).toHaveBeenCalledTimes(2);
      expect(publishFn).toHaveBeenCalledWith(event1);
      expect(publishFn).toHaveBeenCalledWith(event2);
    });

    it("should cancel previous timer when merging duplicates", async () => {
      const event1 = { userId: "user1", docId: "doc1", permission: "edit" };
      const event2 = { userId: "user1", docId: "doc1", permission: "view" };

      (mockRedisService.get as any).mockResolvedValueOnce(null);
      await deduplicator.deduplicate("PERMISSION_UPDATED", event1, publishFn);

      // Advance timer by 50ms (not enough to publish)
      vi.advanceTimersByTime(50);

      (mockRedisService.get as any).mockResolvedValueOnce(JSON.stringify(event1));
      await deduplicator.deduplicate("PERMISSION_UPDATED", event2, publishFn);

      // First timer was canceled, so advancing by 50ms shouldn't publish
      vi.advanceTimersByTime(50);
      expect(publishFn).not.toHaveBeenCalled();

      // Need to advance by another 50ms (total 150ms from second event)
      vi.advanceTimersByTime(50);
      await vi.runAllTimersAsync();

      expect(publishFn).toHaveBeenCalledTimes(1);
      expect(publishFn).toHaveBeenCalledWith(event2);
    });
  });

  describe("clearPending", () => {
    it("should clear all pending timers", async () => {
      const event = { userId: "user1", docId: "doc1", permission: "edit" };
      (mockRedisService.get as any).mockResolvedValue(null);

      await deduplicator.deduplicate("PERMISSION_UPDATED", event, publishFn);

      deduplicator.clearPending();

      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();

      expect(publishFn).not.toHaveBeenCalled();
    });
  });
});
