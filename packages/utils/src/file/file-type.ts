import { fileTypeFromBuffer } from "file-type";

/**
 * File type detection result
 */
export interface FileTypeResult {
  /** File extension (e.g., 'png', 'pdf', 'docx') */
  ext: string;
  /** MIME type (e.g., 'image/png', 'application/pdf') */
  mimeType: string;
}

/**
 * Detect file type from various input sources using magic number (binary signature) detection.
 *
 * **Important Notes:**
 * - This works in both Node.js (Buffer) and browser (File/Blob/ArrayBuffer/Uint8Array)
 * - Detection is based on binary signatures, NOT text-based formats (.txt, .csv, .svg)
 * - Uses arrayBuffer() approach for maximum browser compatibility (avoids ReadableStreamBYOBReader)
 * - Returns undefined if file type cannot be detected
 *
 * @param input - File, Blob, Buffer, Uint8Array, or ArrayBuffer to detect
 * @returns File type information or null if detection fails
 *
 * @example
 * // Browser: Detect from File
 * const file = new File(['...'], 'document.pdf');
 * const type = await detectFileType(file);
 * console.log(type); // { ext: 'pdf', mimeType: 'application/pdf' }
 *
 * @example
 * // Node.js: Detect from Buffer
 * const buffer = fs.readFileSync('image.png');
 * const type = await detectFileType(buffer);
 * console.log(type); // { ext: 'png', mimeType: 'image/png' }
 */
export async function detectFileType(input: File | Blob | Buffer | Uint8Array | ArrayBuffer): Promise<FileTypeResult | null> {
  try {
    let buffer: Uint8Array | Buffer;

    // Convert input to buffer format that file-type can handle
    if (input instanceof File || input instanceof Blob) {
      // Browser: Convert Blob/File to ArrayBuffer, then to Uint8Array
      // This approach avoids ReadableStreamBYOBReader compatibility issues
      const arrayBuffer = await input.arrayBuffer();
      buffer = new Uint8Array(arrayBuffer);
    } else if (input instanceof ArrayBuffer) {
      // Convert ArrayBuffer to Uint8Array
      buffer = new Uint8Array(input);
    } else {
      // Uint8Array or Node.js Buffer (Buffer extends Uint8Array)
      // Both types are compatible with fileTypeFromBuffer
      buffer = input;
    }

    // Detect file type using magic number
    // fileTypeFromBuffer accepts Uint8Array and ArrayBuffer
    // Buffer (Node.js) extends Uint8Array, so it's compatible
    const result = await fileTypeFromBuffer(buffer as Uint8Array | ArrayBuffer);

    if (!result) {
      return null;
    }

    return {
      ext: result.ext,
      mimeType: result.mime,
    };
  } catch (error) {
    console.error("Failed to detect file type:", error);
    return null;
  }
}

/**
 * Get comprehensive file information including detected type (browser only).
 *
 * This function combines File metadata with magic number detection to provide
 * accurate file type information. Falls back to File properties if detection fails.
 *
 * **Use Case:** Upload flows, file validation, file processing
 *
 * @param file - Browser File object to analyze
 * @returns File information with name, size, extension, and MIME type
 *
 * @example
 * // Handle file upload
 * const fileInput = document.querySelector('input[type="file"]');
 * const file = fileInput.files[0];
 * const info = await getFileInfo(file);
 * console.log(info);
 * // {
 * //   name: 'document.pdf',
 * //   size: 1024000,
 * //   ext: 'pdf',
 * //   mimeType: 'application/pdf'
 * // }
 */
export async function getFileInfo(file: File): Promise<{
  name: string;
  size: number;
  ext: string;
  mimeType: string;
}> {
  const { name, size } = file;

  // Detect actual file type using magic number
  const detectedType = await detectFileType(file);

  // Extract extension from filename as fallback
  const fileNameExt = name.split(".").pop()?.toLowerCase() || "";

  return {
    name,
    size,
    // Prefer detected extension, fall back to filename extension
    ext: detectedType?.ext || fileNameExt,
    // Prefer detected MIME type, fall back to File.type, then generic binary
    mimeType: detectedType?.mimeType || file.type || "application/octet-stream",
  };
}

/**
 * Validate if a file matches expected type(s).
 *
 * Performs magic number detection to verify file type, not just checking the extension.
 * Useful for security validation in upload flows.
 *
 * @param input - File, Blob, or Buffer to validate
 * @param expectedTypes - Single extension or array of extensions (e.g., 'pdf' or ['jpg', 'png'])
 * @returns True if file matches one of the expected types
 *
 * @example
 * // Validate image upload
 * const file = uploadInput.files[0];
 * const isValidImage = await validateFileType(file, ['jpg', 'png', 'gif']);
 * if (!isValidImage) {
 *   throw new Error('Please upload a valid image file');
 * }
 */
export async function validateFileType(input: File | Blob | Buffer | Uint8Array | ArrayBuffer, expectedTypes: string | string[]): Promise<boolean> {
  const detectedType = await detectFileType(input);

  if (!detectedType) {
    return false;
  }

  const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];
  return types.some((type) => type.toLowerCase() === detectedType.ext.toLowerCase());
}
