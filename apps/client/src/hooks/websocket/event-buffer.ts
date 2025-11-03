interface BufferedEvent {
  sequence: number;
  event: any;
  timeout: NodeJS.Timeout;
}

export class WebSocketEventBuffer {
  private buffer: BufferedEvent[] = [];
  private expectedSequence = 1;
  private readonly BUFFER_TIMEOUT_MS = 2000;

  processEvent(sequence: number, event: any, applyFn: (event: any) => void): void {
    if (sequence === this.expectedSequence) {
      // Event is in order, apply immediately
      applyFn(event);
      this.expectedSequence++;
      this.flushBuffer(applyFn);
    } else if (sequence > this.expectedSequence) {
      // Event is out of order, buffer it
      this.bufferEvent(sequence, event, applyFn);
    } else {
      // Event is old/duplicate, ignore
      console.warn(`[EventBuffer] Ignoring old event sequence ${sequence}, expected ${this.expectedSequence}`);
    }
  }

  private bufferEvent(sequence: number, event: any, applyFn: (event: any) => void): void {
    // Create timeout to force-apply after delay
    const timeout = setTimeout(() => {
      console.warn(`[EventBuffer] Applying out-of-order event sequence ${sequence}, expected ${this.expectedSequence}`);
      applyFn(event);
      this.removeFromBuffer(sequence);

      // Update expected sequence if we're catching up
      if (sequence >= this.expectedSequence) {
        this.expectedSequence = sequence + 1;
        this.flushBuffer(applyFn);
      }
    }, this.BUFFER_TIMEOUT_MS);

    // Add to buffer
    this.buffer.push({ sequence, event, timeout });
    this.buffer.sort((a, b) => a.sequence - b.sequence);
  }

  private flushBuffer(applyFn: (event: any) => void): void {
    while (this.buffer.length > 0 && this.buffer[0].sequence === this.expectedSequence) {
      const buffered = this.buffer.shift()!;
      clearTimeout(buffered.timeout);
      applyFn(buffered.event);
      this.expectedSequence++;
    }
  }

  private removeFromBuffer(sequence: number): void {
    const index = this.buffer.findIndex((b) => b.sequence === sequence);
    if (index >= 0) {
      const buffered = this.buffer.splice(index, 1)[0];
      clearTimeout(buffered.timeout);
    }
  }

  clear(): void {
    this.buffer.forEach((b) => clearTimeout(b.timeout));
    this.buffer = [];
    this.expectedSequence = 1;
  }
}
