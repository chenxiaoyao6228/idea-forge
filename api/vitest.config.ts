import { defineConfig } from "vitest/config";
import { resolve } from "path";
import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";


export default defineConfig({
  cacheDir: "../.cache/vitest/idea-forge-api/unit",
  test: {
    globals: true, // no need to import vitest api in tests
    environment: "node",
    include: [
      "src/**/*.unit.test.ts",
    ],
    exclude: ["node_modules", "dist"],
    testTimeout: 5000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage/unit",
      extension: [".js", ".ts"],
      include: ["src/**/*"],
    },
  },
  optimizeDeps: {
    needsInterop: ["lodash"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@test": resolve(__dirname, "./test"),
      "@shared": resolve(__dirname, "./src/_shared"),
    },
  },
  esbuild: false,
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
    tsconfigPaths(),
  ],
});
