declare module "ifvisible.js" {
  export interface IfVisible {
    /**
     * Check if page is currently visible
     * @param statusType - Optional: 'focus' to check if page has focus, 'active' to check if user is active
     */
    now(statusType?: "focus" | "active"): boolean;

    /**
     * Set idle duration in seconds
     */
    setIdleDuration(seconds: number): void;

    /**
     * Register event listener
     * @param event - Event name: 'blur', 'focus', 'idle', 'wakeup'
     * @param callback - Callback function
     */
    on(event: "blur" | "focus" | "idle" | "wakeup", callback: () => void): void;

    /**
     * Remove event listener
     * @param event - Event name
     * @param callback - Callback function to remove
     */
    off(event: "blur" | "focus" | "idle" | "wakeup", callback: () => void): void;

    /**
     * Check if page is currently idle
     */
    idle(): boolean;

    /**
     * Get idle duration in seconds
     */
    getIdleDuration(): number;

    /**
     * Get idle info
     */
    getIdleInfo(): {
      isIdle: boolean;
      idleFor: number;
      timeLeft: number;
      timeLeftPer: number;
    };
  }

  const ifvisible: IfVisible;
  export default ifvisible;
}
