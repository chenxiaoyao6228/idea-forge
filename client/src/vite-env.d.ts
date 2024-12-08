/// <reference types="vite/client" />

import type { ClientEnv } from "@server/export-to-client";

declare global {
  interface Window {
    __ENV__: ClientEnv;
  }
}
