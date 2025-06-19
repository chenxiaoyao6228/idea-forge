import { defineConfig } from "vitest/config";
import { resolve } from "path";
import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    // see: https://www.reddit.com/r/node/comments/1jvuk6e/tests_fail_when_running_all_together_but_pass/
    fileParallelism: false,
    globals: true, // no need to import vitest api in tests
    environment: "node",
    setupFiles: [resolve(__dirname, "./test/setup/global-setup.ts")],
    include: [
      "src/**/*.test.ts", // Unit tests & integration tests(connected to database)
      "test/**/*.{test,spec}.ts", // Test directory tests
    ],
    exclude: ["node_modules", "dist"],
    testTimeout: 30000,
    hookTimeout: 30000,
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
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
