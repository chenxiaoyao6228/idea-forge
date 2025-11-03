export type TransferStatus =
  | "ready" // Queued, not started
  | "uploading" // Uploading to storage
  | "processing" // Post-upload processing (parsing, converting, etc.)
  | "complete" // Successfully completed
  | "failed" // Failed at any stage
  | "cancelled"; // User cancelled

export interface TransferFile {
  id: string;
  name: string;
  size: number;
  data: File;
  status: TransferStatus;
  percent: number;

  // Allow custom properties
  [key: string]: any;
}

export interface TransferOptions {
  onBeforeComplete?: (file: TransferFile) => Promise<boolean>;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percent: number;
}
