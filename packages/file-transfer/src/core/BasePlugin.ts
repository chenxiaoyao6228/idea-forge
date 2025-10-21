import type { Transfer } from "./Transfer";
import type { TransferFile } from "./types";

export abstract class BasePlugin {
  protected transfer!: Transfer;

  /**
   * Set the transfer instance
   * Called by Transfer.use()
   */
  setTransfer(transfer: Transfer): void {
    this.transfer = transfer;
  }

  /**
   * Called when plugin is registered
   * Override to add event listeners or setup
   */
  install(): void {
    // Override in subclass
  }

  /**
   * Called when plugin is unregistered
   * Override to cleanup resources
   */
  uninstall(): void {
    // Override in subclass
  }

  /**
   * Main transfer logic
   * Must be implemented by subclass
   */
  abstract transferFile(file: TransferFile): Promise<void>;
}
