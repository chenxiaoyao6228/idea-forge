import { getFileInfo as getFileInfoFromUtils, validateFileType } from "@idea/utils";

/**
 * Get comprehensive file information including detected type.
 * Re-exports the shared utility from @idea/utils for convenience.
 */
export const getFileInfo = getFileInfoFromUtils;

/**
 * Validate if a file matches expected type(s) using magic number detection.
 * Re-exports the shared utility from @idea/utils for convenience.
 *
 * @param file - File or Blob to validate
 * @param type - Single extension or array of extensions (e.g., 'pdf' or ['jpg', 'png'])
 * @returns True if file matches one of the expected types
 *
 * @example
 * const isImage = await checkFileType(file, ['jpg', 'png', 'gif']);
 */
export async function checkFileType(file: Blob | File, type: string | string[]): Promise<boolean> {
  return validateFileType(file, type);
}

// Convert base64 to Blob
export function dataURItoBlob(dataURI: string): Blob {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}

export function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}
