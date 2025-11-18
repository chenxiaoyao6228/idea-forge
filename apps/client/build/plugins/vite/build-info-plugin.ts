import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

interface BuildInfo {
  version: string;
  gitCommitHash: string;
  gitBranch: string;
  buildTime: string;
  nodeVersion: string;
}

function execCommand(command: string): string {
  try {
    return execSync(command, { encoding: "utf-8" }).trim();
  } catch (error) {
    console.warn(`Failed to execute command: ${command}`);
    return "unknown";
  }
}

function generateBuildInfo(): BuildInfo {
  // Get version from root package.json
  let version = "unknown";
  try {
    const rootPackageJsonPath = join(process.cwd(), "../../package.json");
    const packageJsonContent = readFileSync(rootPackageJsonPath, "utf-8");
    const packageJson = JSON.parse(packageJsonContent);
    version = packageJson.version || "unknown";
  } catch (error) {
    console.warn("Failed to read version from package.json");
  }

  // Get git information directly from git commands
  // This works because .git directory is included in Docker build context
  const gitCommitHash = execCommand("git rev-parse --short HEAD");
  const gitBranch = execCommand("git branch --show-current");
  const buildTime = new Date().toISOString();
  const nodeVersion = process.version;

  return {
    version,
    gitCommitHash,
    gitBranch,
    buildTime,
    nodeVersion,
  };
}

/**
 * Vite plugin to generate build-info.json and copy it to the output directory
 */
export function buildInfoPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "build-info-plugin",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    closeBundle() {
      // Generate build info after the bundle is complete
      console.log("Generating build-info.json...");
      try {
        const buildInfo = generateBuildInfo();
        console.log("Build Info:", buildInfo);

        // Write to output directory (apps/api/view)
        const outputPath = join(config.build.outDir, "build-info.json");

        // Ensure output directory exists
        if (!existsSync(config.build.outDir)) {
          mkdirSync(config.build.outDir, { recursive: true });
        }

        writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2), "utf-8");
        console.log(`Build info written to: ${outputPath}`);
      } catch (error) {
        console.error("Failed to generate build info:", error);
        // Don't fail the build, just warn
      }
    },
  };
}
