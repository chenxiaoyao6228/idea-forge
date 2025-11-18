import { execSync } from "node:child_process";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

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
    console.warn(`Failed to execute command: ${command}`, error);
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
    console.warn("Failed to read version from package.json", error);
  }

  // Get git information
  const gitCommitHash = execCommand("git rev-parse --short HEAD");
  const gitBranch = execCommand("git branch --show-current");

  // Get build time
  const buildTime = new Date().toISOString();

  // Get Node version
  const nodeVersion = process.version;

  return {
    version,
    gitCommitHash,
    gitBranch,
    buildTime,
    nodeVersion,
  };
}

function main() {
  console.log("Generating build info...");

  const buildInfo = generateBuildInfo();

  console.log("Build Info:", buildInfo);

  // Ensure public directory exists
  const publicDir = join(process.cwd(), "public");
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  // Write to public/build-info.json
  const outputPath = join(publicDir, "build-info.json");
  writeFileSync(outputPath, JSON.stringify(buildInfo, null, 2), "utf-8");

  console.log(`Build info written to: ${outputPath}`);
}

main();
