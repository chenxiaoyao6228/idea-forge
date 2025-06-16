import { defineConfig } from "vitest/config";
import { resolve } from "path";
import swc from "unplugin-swc";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: [
      process.env.TEST_TYPE === "e2e"
        ? resolve(__dirname, "./test/setup/e2e-setup.ts")
        : resolve(__dirname, "./test/setup/unit-setup.ts"),
    ],
    include: ["src/**/*.{test,spec}.ts", "test/**/*.{test,spec}.ts"],
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
      module: { type: "es6" }, // Changed to ES6 modules
    }),
    tsconfigPaths(),
  ],
});
