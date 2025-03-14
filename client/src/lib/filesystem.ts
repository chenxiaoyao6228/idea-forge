import { fileOpen as _fileOpen, fileSave as _fileSave, type FileSystemHandle, supported as nativeFileSystemSupported } from "browser-fs-access";
import debounce from "lodash.debounce";
import { EVENT, MIME_TYPES } from "@/constants";

type FILE_EXTENSION = Exclude<keyof typeof MIME_TYPES, "binary">;

const INPUT_CHANGE_INTERVAL_MS = 500;

interface FileOpenOptions<M extends boolean | undefined = false> {
  extensions?: FILE_EXTENSION[];
  description: string;
  multiple?: M;
}

type FileOpenResult<M> = M extends false | undefined ? File : File[];

export function fileOpen<M extends boolean | undefined = false>(opts: FileOpenOptions<M>): Promise<FileOpenResult<M>> {
  const accept = Object.fromEntries(opts.extensions?.map((ext) => [MIME_TYPES[ext], [`.${ext}`]]) ?? []);

  return _fileOpen({
    description: opts.description,
    // @ts-ignore
    accept,
    multiple: opts.multiple ?? false,
    legacySetup: createLegacySetup(),
  }) as Promise<FileOpenResult<M>>;

  function createLegacySetup() {
    return (resolve: any, reject: any, input: any) => {
      const scheduleRejection = debounce(reject, INPUT_CHANGE_INTERVAL_MS);

      const checkForFile = () => {
        if (input.files?.length) {
          const ret = input.multiple ? [...input.files] : input.files[0];
          resolve(ret);
        }
      };

      const focusHandler = () => {
        checkForFile();
        document.addEventListener(EVENT.KEYUP, scheduleRejection);
        document.addEventListener(EVENT.POINTER_UP, scheduleRejection);
        scheduleRejection();
      };

      requestAnimationFrame(() => {
        window.addEventListener(EVENT.FOCUS, focusHandler);
      });

      const interval = window.setInterval(checkForFile, INPUT_CHANGE_INTERVAL_MS);

      return (rejectPromise: any) => {
        clearInterval(interval);
        scheduleRejection.cancel();
        window.removeEventListener(EVENT.FOCUS, focusHandler);
        document.removeEventListener(EVENT.KEYUP, scheduleRejection);
        document.removeEventListener(EVENT.POINTER_UP, scheduleRejection);

        if (rejectPromise) {
          console.warn("Opening the file was canceled (legacy-fs).");
          rejectPromise(new Error("Opening the file was canceled (legacy-fs)."));
        }
      };
    };
  }
}

export const fileSave = (
  blob: Blob | Promise<Blob>,
  opts: {
    /** supply without the extension */
    name: string;
    /** file extension */
    extension: FILE_EXTENSION;
    description: string;
    /** existing FileSystemHandle */
    fileHandle?: FileSystemFileHandle | null;
  },
) => {
  return _fileSave(
    blob,
    {
      fileName: `${opts.name}.${opts.extension}`,
      description: opts.description,
      extensions: [`.${opts.extension}`],
    },
    opts.fileHandle,
  );
};

export type { FileSystemHandle };
export { nativeFileSystemSupported };
