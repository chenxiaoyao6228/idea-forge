/// <reference types="vite/client" />

import type { ClientEnv } from "@api/export-to-client";

declare global {
  interface Window {
    __ENV__: ClientEnv;
  }
}
