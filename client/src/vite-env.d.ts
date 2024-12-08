/// <reference types="vite/client" />

import type { ClientEnv } from "@server/export-to-client";

declare global {
  interface Window {
    __ENV__: ClientEnv;
  }
}

// 为了确保这个文件被视为模块而不是全局声明
export {};
