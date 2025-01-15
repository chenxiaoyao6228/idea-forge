import Compressor from "compressorjs";

export async function getImageDimensionsFromFile(file: File) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src); // Clean up the object URL
      resolve({ width: img.width, height: img.height });
    };
  });
}

export async function getImageDimensionsFromUrl(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      reject(new Error(`Failed to load image from URL: ${url}`));
    };
  });
}

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  convertSize?: number;
  strict?: boolean;
  checkOrientation?: boolean;
  retainExif?: boolean;
}

const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 0.6,
  convertSize: 1000000, // 1MB
  strict: true,
  checkOrientation: true,
  retainExif: false,
};

export async function compressImage(file: File | Blob, customOptions?: Partial<CompressionOptions>): Promise<File> {
  // Skip compression for non-image files
  if (!file.type.startsWith("image/")) return file as File;

  // Skip compression for small images (less than 100KB)
  if (file.size < 100 * 1024) return file as File;

  const options = { ...DEFAULT_COMPRESSION_OPTIONS, ...customOptions };

  console.log("Original file size:", (file.size / 1024 / 1024).toFixed(2), "MB");

  return new Promise((resolve, reject) => {
    new Compressor(file, {
      ...options,
      success: (result: Blob) => {
        // Convert back to File with original name
        const fileName = file instanceof File ? file.name : "compressed-image";
        const compressedFile = new File([result], fileName, {
          type: result.type,
          lastModified: Date.now(),
        });
        console.log("Compressed file size:", (compressedFile.size / 1024 / 1024).toFixed(2), "MB");
        resolve(compressedFile);
      },
      error: (err) => {
        console.error("Image compression failed:", err);
        reject(err);
      },
    });
  });
}

// Helper to check if compression is needed
export function shouldCompressImage(file: File): boolean {
  return file.type.startsWith("image/") && file.size > 100 * 1024;
}
