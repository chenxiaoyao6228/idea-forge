import ifvisible from "ifvisible.js";

/**
 * Page Visibility Service
 *
 * Wraps ifvisible.js to provide page visibility and user activity detection.
 * Helps optimize WebSocket connections by pausing reconnections when page is hidden
 * and detecting user inactivity.
 */

export type VisibilityCallback = () => void;
export type IdleCallback = () => void;
export type WakeupCallback = () => void;

export interface PageVisibilityService {
  /**
   * Check if page is currently visible
   */
  isVisible(): boolean;

  /**
   * Check if user is currently idle
   */
  isIdle(): boolean;

  /**
   * Set idle duration in seconds
   */
  setIdleDuration(seconds: number): void;

  /**
   * Register callback for when page becomes visible
   */
  onVisible(callback: VisibilityCallback): () => void;

  /**
   * Register callback for when page becomes hidden
   */
  onHidden(callback: VisibilityCallback): () => void;

  /**
   * Register callback for when user becomes idle
   */
  onIdle(callback: IdleCallback): () => void;

  /**
   * Register callback for when user wakes up from idle
   */
  onWakeup(callback: WakeupCallback): () => void;

  /**
   * Register callback for when page gains focus
   */
  onFocus(callback: VisibilityCallback): () => void;

  /**
   * Register callback for when page loses focus
   */
  onBlur(callback: VisibilityCallback): () => void;

  /**
   * Wait until page becomes visible (returns a promise)
   */
  waitUntilVisible(): Promise<void>;

  /**
   * Wait until user wakes up from idle (returns a promise)
   */
  waitUntilWakeup(): Promise<void>;
}

class PageVisibility implements PageVisibilityService {
  private idleDuration = 300; // Default 5 minutes in seconds

  constructor() {
    // Set initial idle duration
    ifvisible.setIdleDuration(this.idleDuration);
  }

  isVisible(): boolean {
    return ifvisible.now();
  }

  isIdle(): boolean {
    return !ifvisible.now("active");
  }

  setIdleDuration(seconds: number): void {
    this.idleDuration = seconds;
    ifvisible.setIdleDuration(seconds);
  }

  onVisible(callback: VisibilityCallback): () => void {
    ifvisible.on("wakeup", callback);
    return () => {
      ifvisible.off("wakeup", callback);
    };
  }

  onHidden(callback: VisibilityCallback): () => void {
    ifvisible.on("idle", callback);
    return () => {
      ifvisible.off("idle", callback);
    };
  }

  onIdle(callback: IdleCallback): () => void {
    ifvisible.on("idle", callback);
    return () => {
      ifvisible.off("idle", callback);
    };
  }

  onWakeup(callback: WakeupCallback): () => void {
    ifvisible.on("wakeup", callback);
    return () => {
      ifvisible.off("wakeup", callback);
    };
  }

  onFocus(callback: VisibilityCallback): () => void {
    ifvisible.on("focus", callback);
    return () => {
      ifvisible.off("focus", callback);
    };
  }

  onBlur(callback: VisibilityCallback): () => void {
    ifvisible.on("blur", callback);
    return () => {
      ifvisible.off("blur", callback);
    };
  }

  /**
   * Wait until page becomes visible (returns a promise)
   * Useful for async/await flows
   */
  waitUntilVisible(): Promise<void> {
    if (this.isVisible()) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const cleanup = this.onVisible(() => {
        cleanup();
        resolve();
      });
    });
  }

  /**
   * Wait until user wakes up from idle (returns a promise)
   */
  waitUntilWakeup(): Promise<void> {
    if (!this.isIdle()) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const cleanup = this.onWakeup(() => {
        cleanup();
        resolve();
      });
    });
  }
}

// Export singleton instance
let pageVisibilityService: PageVisibilityService | null = null;

export const getPageVisibilityService = (): PageVisibilityService => {
  if (!pageVisibilityService) {
    pageVisibilityService = new PageVisibility();
  }
  return pageVisibilityService;
};

// Export direct access for convenience
export const pageVisibility = {
  get service() {
    return getPageVisibilityService();
  },
  isVisible: () => getPageVisibilityService().isVisible(),
  isIdle: () => getPageVisibilityService().isIdle(),
  setIdleDuration: (seconds: number) => getPageVisibilityService().setIdleDuration(seconds),
  onVisible: (callback: VisibilityCallback) => getPageVisibilityService().onVisible(callback),
  onHidden: (callback: VisibilityCallback) => getPageVisibilityService().onHidden(callback),
  onIdle: (callback: IdleCallback) => getPageVisibilityService().onIdle(callback),
  onWakeup: (callback: WakeupCallback) => getPageVisibilityService().onWakeup(callback),
  onFocus: (callback: VisibilityCallback) => getPageVisibilityService().onFocus(callback),
  onBlur: (callback: VisibilityCallback) => getPageVisibilityService().onBlur(callback),
  waitUntilVisible: () => getPageVisibilityService().waitUntilVisible(),
  waitUntilWakeup: () => getPageVisibilityService().waitUntilWakeup(),
};
