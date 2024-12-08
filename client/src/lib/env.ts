import type { ClientEnv } from "@server/export-to-client";

export const getEnvVariable = <K extends keyof ClientEnv>(
  key: K
): ClientEnv[K] => {
  if (!window.__ENV__) {
    throw new Error("Environment variables not initialized");
  }
  return window.__ENV__[key];
};
