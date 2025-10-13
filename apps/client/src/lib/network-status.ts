/**
 * Network Status Service
 *
 * Provides a simple API to check network connectivity and subscribe to network status changes.
 * Uses native browser APIs - no external dependencies required.
 */

type NetworkStatusCallback = (isOnline: boolean) => void;

class NetworkStatusService {
  private listeners = new Set<NetworkStatusCallback>();
  private _isOnline: boolean;

  constructor() {
    // Initialize with current browser status
    this._isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    // Listen to browser online/offline events
    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  /**
   * Check if currently online
   */
  get isOnline(): boolean {
    return this._isOnline;
  }

  /**
   * Check if currently offline
   */
  get isOffline(): boolean {
    return !this._isOnline;
  }

  /**
   * Get current status as string
   */
  get status(): "online" | "offline" {
    return this._isOnline ? "online" : "offline";
  }

  /**
   * Subscribe to network status changes
   * @param callback - Function called when network status changes
   * @returns Cleanup function to unsubscribe
   */
  onChange(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);

    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Convenience method: Subscribe to online event
   */
  onOnline(callback: () => void): () => void {
    const wrappedCallback: NetworkStatusCallback = (isOnline) => {
      if (isOnline) callback();
    };
    this.listeners.add(wrappedCallback);

    return () => {
      this.listeners.delete(wrappedCallback);
    };
  }

  /**
   * Convenience method: Subscribe to offline event
   */
  onOffline(callback: () => void): () => void {
    const wrappedCallback: NetworkStatusCallback = (isOnline) => {
      if (!isOnline) callback();
    };
    this.listeners.add(wrappedCallback);

    return () => {
      this.listeners.delete(wrappedCallback);
    };
  }

  private handleOnline = () => {
    if (!this._isOnline) {
      console.log("[network-status]: Network is online");
      this._isOnline = true;
      this.notifyListeners();
    }
  };

  private handleOffline = () => {
    if (this._isOnline) {
      console.log("[network-status]: Network is offline");
      this._isOnline = false;
      this.notifyListeners();
    }
  };

  private notifyListeners() {
    this.listeners.forEach((callback) => {
      try {
        callback(this._isOnline);
      } catch (error) {
        console.error("[network-status]: Error in status change listener:", error);
      }
    });
  }

  /**
   * Wait until network is online (returns a promise)
   * Useful for async/await flows
   */
  waitUntilOnline(): Promise<void> {
    if (this.isOnline) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const cleanup = this.onOnline(() => {
        cleanup();
        resolve();
      });
    });
  }

  /**
   * Wait until network is offline (returns a promise)
   */
  waitUntilOffline(): Promise<void> {
    if (this.isOffline) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const cleanup = this.onOffline(() => {
        cleanup();
        resolve();
      });
    });
  }

  /**
   * Cleanup method (for testing or teardown)
   */
  destroy() {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
    this.listeners.clear();
  }
}

// Export singleton instance
export const networkStatus = new NetworkStatusService();
