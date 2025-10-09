import { Injectable } from "@nestjs/common";
import { RedisService } from "@/_shared/database/redis/redis.service";

@Injectable()
export class EventDeduplicator {
  private static readonly DEDUP_WINDOW_MS = 5000;
  private static readonly PUBLISH_DELAY_MS = 100;
  private pendingEvents = new Map<string, NodeJS.Timeout>();

  constructor(private redis: RedisService) {}

  async deduplicate<T extends { userId: string; docId: string }>(eventType: string, event: T, publishFn: (event: T) => Promise<void>): Promise<void> {
    const dedupKey = `${eventType}:${event.userId}:${event.docId}`;
    const cacheKey = `event:dedup:${dedupKey}`;

    // Check if event already pending
    const existing = await this.redis.get(cacheKey);

    if (existing) {
      // Merge with existing event
      const merged = this.mergeEvents(JSON.parse(existing), event);

      // Set with millisecond precision using setex (convert ms to seconds)
      await this.redis.setex(cacheKey, Math.ceil(EventDeduplicator.DEDUP_WINDOW_MS / 1000), JSON.stringify(merged));

      // Cancel previous publish timer
      if (this.pendingEvents.has(dedupKey)) {
        clearTimeout(this.pendingEvents.get(dedupKey)!);
      }
    } else {
      // New event, store in cache
      await this.redis.setex(cacheKey, Math.ceil(EventDeduplicator.DEDUP_WINDOW_MS / 1000), JSON.stringify(event));
    }

    // Schedule publish with delay
    const timer = setTimeout(async () => {
      const final = await this.redis.get(cacheKey);
      if (final) {
        await publishFn(JSON.parse(final));
        await this.redis.del(cacheKey);
      }
      this.pendingEvents.delete(dedupKey);
    }, EventDeduplicator.PUBLISH_DELAY_MS);

    this.pendingEvents.set(dedupKey, timer);
  }

  private mergeEvents<T extends { affectedDocuments?: any[] }>(existing: T, incoming: T): T {
    if (existing.affectedDocuments && incoming.affectedDocuments) {
      // Union merge of affected documents
      const docMap = new Map(existing.affectedDocuments.map((d) => [d.docId, d]));
      incoming.affectedDocuments.forEach((d) => docMap.set(d.docId, d));

      return {
        ...incoming, // Latest event wins
        affectedDocuments: Array.from(docMap.values()),
      };
    }
    return incoming;
  }

  /**
   * Clear all pending timers (for cleanup/testing)
   */
  clearPending(): void {
    for (const timer of this.pendingEvents.values()) {
      clearTimeout(timer);
    }
    this.pendingEvents.clear();
  }
}
