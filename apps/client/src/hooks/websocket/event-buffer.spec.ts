import { describe, it, expect, beforeEach, vi } from "vitest";
import { WebSocketEventBuffer } from "./event-buffer";

describe("WebSocketEventBuffer", () => {
  let buffer: WebSocketEventBuffer;
  let applyFn: any;

  beforeEach(() => {
    buffer = new WebSocketEventBuffer();
    applyFn = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    buffer.clear();
  });

  describe("processEvent", () => {
    it("should apply events in correct sequence order", () => {
      const event1 = { data: "event1" };
      const event2 = { data: "event2" };
      const event3 = { data: "event3" };

      buffer.processEvent(1, event1, applyFn);
      buffer.processEvent(2, event2, applyFn);
      buffer.processEvent(3, event3, applyFn);

      expect(applyFn).toHaveBeenCalledTimes(3);
      expect(applyFn).toHaveBeenNthCalledWith(1, event1);
      expect(applyFn).toHaveBeenNthCalledWith(2, event2);
      expect(applyFn).toHaveBeenNthCalledWith(3, event3);
    });

    it("should buffer out-of-order events and apply when next sequence arrives", () => {
      const event1 = { data: "event1" };
      const event2 = { data: "event2" };
      const event3 = { data: "event3" };

      // Receive events out of order: 1, 3, 2
      buffer.processEvent(1, event1, applyFn);
      expect(applyFn).toHaveBeenCalledTimes(1);
      expect(applyFn).toHaveBeenCalledWith(event1);

      buffer.processEvent(3, event3, applyFn);
      // Event 3 should be buffered, not applied yet
      expect(applyFn).toHaveBeenCalledTimes(1);

      buffer.processEvent(2, event2, applyFn);
      // Event 2 arrives, should trigger both 2 and 3
      expect(applyFn).toHaveBeenCalledTimes(3);
      expect(applyFn).toHaveBeenNthCalledWith(2, event2);
      expect(applyFn).toHaveBeenNthCalledWith(3, event3);
    });

    it("should force-apply buffered event after 2-second timeout", () => {
      const event1 = { data: "event1" };
      const event3 = { data: "event3" };

      buffer.processEvent(1, event1, applyFn);
      buffer.processEvent(3, event3, applyFn); // Skip sequence 2

      expect(applyFn).toHaveBeenCalledTimes(1); // Only event1

      // Advance time by 2 seconds
      vi.advanceTimersByTime(2000);

      // Event 3 should be force-applied
      expect(applyFn).toHaveBeenCalledTimes(2);
      expect(applyFn).toHaveBeenNthCalledWith(2, event3);
    });

    it("should ignore old/duplicate events with lower sequence numbers", () => {
      const event1 = { data: "event1" };
      const event2 = { data: "event2" };
      const eventOld = { data: "eventOld" };

      buffer.processEvent(1, event1, applyFn);
      buffer.processEvent(2, event2, applyFn);

      // Try to process old event with sequence 1
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      buffer.processEvent(1, eventOld, applyFn);

      expect(applyFn).toHaveBeenCalledTimes(2); // Only event1 and event2
      expect(applyFn).not.toHaveBeenCalledWith(eventOld);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Ignoring old event sequence 1, expected 3"));

      consoleWarnSpy.mockRestore();
    });

    it("should handle multiple buffered events in correct order", () => {
      const events = [
        { seq: 1, data: "e1" },
        { seq: 2, data: "e2" },
        { seq: 3, data: "e3" },
        { seq: 4, data: "e4" },
        { seq: 5, data: "e5" },
      ];

      // Receive in order: 1, 5, 3, 4, 2
      buffer.processEvent(1, events[0], applyFn);
      buffer.processEvent(5, events[4], applyFn);
      buffer.processEvent(3, events[2], applyFn);
      buffer.processEvent(4, events[3], applyFn);
      buffer.processEvent(2, events[1], applyFn); // This should trigger flush

      expect(applyFn).toHaveBeenCalledTimes(5);
      expect(applyFn).toHaveBeenNthCalledWith(1, events[0]);
      expect(applyFn).toHaveBeenNthCalledWith(2, events[1]);
      expect(applyFn).toHaveBeenNthCalledWith(3, events[2]);
      expect(applyFn).toHaveBeenNthCalledWith(4, events[3]);
      expect(applyFn).toHaveBeenNthCalledWith(5, events[4]);
    });

    it("should update expected sequence after force-applying out-of-order event", () => {
      const event1 = { data: "event1" };
      const event5 = { data: "event5" };
      const event6 = { data: "event6" };

      buffer.processEvent(1, event1, applyFn);
      buffer.processEvent(5, event5, applyFn); // Skip 2, 3, 4

      // Force-apply after timeout
      vi.advanceTimersByTime(2000);

      expect(applyFn).toHaveBeenCalledTimes(2);

      // Now sequence 6 should be accepted
      buffer.processEvent(6, event6, applyFn);
      expect(applyFn).toHaveBeenCalledTimes(3);
      expect(applyFn).toHaveBeenNthCalledWith(3, event6);
    });
  });

  describe("clear", () => {
    it("should clear buffer and reset expected sequence", () => {
      const event1 = { data: "event1" };
      const event3 = { data: "event3" };

      buffer.processEvent(1, event1, applyFn);
      buffer.processEvent(3, event3, applyFn); // Buffered

      buffer.clear();

      // Advance timers - buffered event should not be applied
      vi.advanceTimersByTime(2000);
      expect(applyFn).toHaveBeenCalledTimes(1); // Only event1

      // Expected sequence should be reset to 1
      const newEvent = { data: "newEvent" };
      buffer.processEvent(1, newEvent, applyFn);
      expect(applyFn).toHaveBeenCalledTimes(2);
      expect(applyFn).toHaveBeenNthCalledWith(2, newEvent);
    });

    it("should cancel all pending timeouts", () => {
      const event2 = { data: "event2" };
      const event3 = { data: "event3" };

      buffer.processEvent(2, event2, applyFn); // Skip 1, buffered
      buffer.processEvent(3, event3, applyFn); // Buffered

      buffer.clear();

      vi.advanceTimersByTime(2000);

      // No events should be applied after clear
      expect(applyFn).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle receiving sequence 1 after skipping ahead", () => {
      const event5 = { data: "event5" };
      const event1 = { data: "event1" };

      buffer.processEvent(5, event5, applyFn); // Skip to 5

      // Force-apply
      vi.advanceTimersByTime(2000);
      expect(applyFn).toHaveBeenCalledWith(event5);

      // Now receiving sequence 1 should be ignored (old)
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      buffer.processEvent(1, event1, applyFn);

      expect(applyFn).toHaveBeenCalledTimes(1); // Only event5
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("Ignoring old event"));

      consoleWarnSpy.mockRestore();
    });

    it("should handle same sequence number multiple times", () => {
      const event1a = { data: "event1a" };
      const event1b = { data: "event1b" };

      buffer.processEvent(1, event1a, applyFn);

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      buffer.processEvent(1, event1b, applyFn);

      expect(applyFn).toHaveBeenCalledTimes(1);
      expect(applyFn).toHaveBeenCalledWith(event1a);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });
});
