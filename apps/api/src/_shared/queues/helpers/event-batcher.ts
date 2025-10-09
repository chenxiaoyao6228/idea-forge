export interface BatchedEvent<T> {
  batchSequence: number;
  batchIndex: number;
  totalBatches: number;
  data: T[];
}

export class EventBatcher {
  private static sequenceCounter = 0;
  private static readonly MAX_BATCH_SIZE = 50;

  static getNextSequence(): number {
    return ++EventBatcher.sequenceCounter;
  }

  static batchDocuments<T>(documents: T[]): BatchedEvent<T>[] {
    const batches: BatchedEvent<T>[] = [];
    const totalBatches = Math.ceil(documents.length / EventBatcher.MAX_BATCH_SIZE);

    for (let i = 0; i < documents.length; i += EventBatcher.MAX_BATCH_SIZE) {
      const batchData = documents.slice(i, i + EventBatcher.MAX_BATCH_SIZE);
      batches.push({
        batchSequence: EventBatcher.getNextSequence(),
        batchIndex: batches.length,
        totalBatches,
        data: batchData,
      });
    }

    return batches;
  }

  /**
   * Reset sequence counter (primarily for testing)
   */
  static resetSequence(): void {
    EventBatcher.sequenceCounter = 0;
  }
}
