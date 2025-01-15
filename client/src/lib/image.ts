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
