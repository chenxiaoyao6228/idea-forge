import { EventEmitter } from "../utils/EventEmitter";
import { BasePlugin } from "./BasePlugin";
import { TransferFile, TransferStatus, TransferOptions } from "./types";
import { v4 as uuid } from "uuid";

export class Transfer {
  private files: Map<string, TransferFile> = new Map();
  private plugin: BasePlugin | null = null;
  public emitter: EventEmitter;
  private options: TransferOptions;

  constructor(options: TransferOptions = {}) {
    this.options = options;
    this.emitter = new EventEmitter();
  }

  /**
   * Register a plugin
   */
  use(plugin: BasePlugin): void {
    if (this.plugin) {
      throw new Error("Only one plugin can be registered at a time");
    }
    this.plugin = plugin;
    plugin.setTransfer(this);
    plugin.install();
  }

  /**
   * Add a file to the transfer queue
   * Returns the generated file ID
   */
  addFile(file: File | { file: File; [key: string]: any }): string {
    const fileId = uuid();
    const isSimpleFile = file instanceof File;

    const transferFile: TransferFile = {
      id: fileId,
      name: isSimpleFile ? file.name : file.file.name,
      size: isSimpleFile ? file.size : file.file.size,
      data: isSimpleFile ? file : file.file,
      status: "ready",
      percent: 0,
      // Spread custom properties if provided
      ...(isSimpleFile ? {} : file),
    };

    this.files.set(fileId, transferFile);
    this.emitter.emit("added", transferFile);

    return fileId;
  }

  /**
   * Add multiple files
   */
  addFiles(files: (File | { file: File; [key: string]: any })[]): string[] {
    return files.map((file) => this.addFile(file));
  }

  /**
   * Start transfer for specified file(s)
   * If no fileId provided, transfers all ready files
   */
  async run(fileId?: string | string[]): Promise<void> {
    if (!this.plugin) {
      throw new Error("No plugin registered. Call use() first.");
    }

    const ids = this.getFileIds(fileId);

    // Run transfers in parallel
    await Promise.all(ids.map((id) => this.runSingleFile(id)));
  }

  /**
   * Run transfer for a single file
   */
  private async runSingleFile(fileId: string): Promise<void> {
    const file = this.files.get(fileId);
    if (!file || file.status !== "ready") {
      return;
    }

    try {
      await this.plugin!.transferFile(file);
    } catch (error) {
      file.status = "failed";
      this.emitter.emit("error", file, error);
    }
  }

  /**
   * Cancel a file transfer
   */
  cancelFile(fileId: string): void {
    const file = this.files.get(fileId);
    if (!file) return;

    if (["ready", "uploading", "processing"].includes(file.status)) {
      file.status = "cancelled";
      this.emitter.emit("cancel", file);

      // Cancel XHR if exists
      if (file.xhr && typeof file.xhr.abort === "function") {
        file.xhr.abort();
      }
    }
  }

  /**
   * Get a file by ID
   */
  getFile(fileId: string): TransferFile | undefined {
    return this.files.get(fileId);
  }

  /**
   * Get all files
   */
  getFiles(): TransferFile[] {
    return Array.from(this.files.values());
  }

  /**
   * Append custom properties to a file
   */
  appendItemProps(fileId: string, props: Record<string, any>): void {
    const file = this.files.get(fileId);
    if (file) {
      Object.assign(file, props);
    }
  }

  /**
   * Update file status and emit event
   */
  updateFileStatus(fileId: string, status: TransferStatus, percent?: number): void {
    const file = this.files.get(fileId);
    if (!file) return;

    file.status = status;
    if (percent !== undefined) {
      file.percent = percent;
    }

    this.emitter.emit("statusChange", file);
  }

  /**
   * Update file progress
   */
  updateFileProgress(fileId: string, percent: number): void {
    const file = this.files.get(fileId);
    if (!file) return;

    file.percent = percent;
    this.emitter.emit("progress", file);
  }

  /**
   * Get file IDs from input parameter
   */
  private getFileIds(fileId?: string | string[]): string[] {
    if (!fileId) {
      // Return all ready files
      return Array.from(this.files.values())
        .filter((f) => f.status === "ready")
        .map((f) => f.id);
    }

    if (Array.isArray(fileId)) {
      return fileId;
    }

    return [fileId];
  }
}
