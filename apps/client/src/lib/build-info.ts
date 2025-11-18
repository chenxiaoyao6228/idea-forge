/**
 * Build information interface
 */
export interface BuildInfo {
  version: string;
  gitCommitHash: string;
  gitBranch: string;
  buildTime: string;
  nodeVersion: string;
}

/**
 * Get build information from window.__BUILD_INFO__
 * This is injected by the server at runtime via fallback middleware
 */
export function getBuildInfo(): BuildInfo | null {
  if (typeof window === "undefined") {
    return null;
  }

  const buildInfo = (window as any).__BUILD_INFO__;

  if (!buildInfo) {
    console.warn("Build info not found. Make sure the server injected it correctly.");
    return null;
  }

  return buildInfo as BuildInfo;
}

/**
 * Get a specific build info field
 */
export function getBuildInfoField<K extends keyof BuildInfo>(field: K): BuildInfo[K] | null {
  const buildInfo = getBuildInfo();
  return buildInfo?.[field] ?? null;
}

/**
 * Log build info to console (useful for debugging)
 */
export function logBuildInfo(): void {
  const buildInfo = getBuildInfo();
  if (buildInfo) {
    console.group("🔧 Build Info");
    console.log("Version:", buildInfo.version);
    console.log("Commit:", buildInfo.gitCommitHash);
    console.log("Branch:", buildInfo.gitBranch);
    console.log("Built at:", new Date(buildInfo.buildTime).toLocaleString());
    console.log("Node version:", buildInfo.nodeVersion);
    console.groupEnd();
  }
}
