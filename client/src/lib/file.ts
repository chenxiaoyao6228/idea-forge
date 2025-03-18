import { TypeFile } from "get-real-file-type";

export async function getFileInfo(file: File) {
  const { name, size } = file;
  const { realMime, mime, ext } = await getRealFileType(file);

  return {
    name,
    size,
    ext,
    mimeType: realMime || mime,
  };
}

// Get the real file type using TypeFile
export function getRealFileType(file: File | Blob | Uint8Array): Promise<TypeFile> {
  return new Promise((resolve, reject) => {
    const typeFile = new TypeFile(file);
    typeFile.onParseEnd = function (this: TypeFile) {
      resolve(this);
    };
    typeFile.onParseError = function (this: TypeFile) {
      reject(this);
    };
    typeFile.start();
  });
}

/**
 * REAL_FIRST: 0 - Compare real file info first
 * BROWSER_FIRST: 1 - Compare browser file info first
 * REAL_ONLY: 2 - Compare only real file info
 * BROWSER_ONLY: 3 - Compare only browser file info
 */
export async function checkFileType(file: Blob | File, type: string | string[], compareType: number = TypeFile.COMPARE_TYPE.REAL_FIRST): Promise<boolean> {
  const res = await getRealFileType(file);
  const types = Array.isArray(type) ? type : [type];

  return types.some((t) => res.isType(t, compareType));
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
