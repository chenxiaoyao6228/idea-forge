import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { inspectorServer } from "@react-dev-inspector/vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import { iconsSpritesheet } from "vite-plugin-icons-spritesheet";
import timeReporter from "vite-plugin-time-reporter";
import checker from 'vite-plugin-checker';
// TODO:  
const port = 5173;
const isDev = process.env.NODE_ENV !== "production";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    isDev && checker({
      typescript: true,
      // Optional: Enable ESLint checking
      // eslint: {
      //   lintCommand: 'eslint "./src/**/*.{ts,tsx}"',
      // },
    }),
    isDev ? inspectorServer() : null,
    !isDev && timeReporter(),
    react(),
    tsconfigPaths(),

    iconsSpritesheet({
      inputDir: "./src/assets/icons",
      typesOutputFile: "./src/components/ui/icons.d.ts",
      outputDir: "../api/public/",
      withTypes: true,
      fileName: "sprite.svg",
    }),
    // sentryVitePlugin({
    //   org: "yorkchan6228",
    //   project: "idea-forge-client",
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    // })
  ].filter(Boolean),
  server: {
    port: port,
    origin: `http://localhost:${port}`,
  },
  build: {
    // generate .vite/manifest.json in outDir
    // set output directory to api/view
    outDir: "../api/view",

    // clear directory before building
    emptyOutDir: true,

    manifest: true,

    rollupOptions: {
      input: "src/index.tsx", // specify entry file
      output: {
        // ensure resource files are placed in the assets directory
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },

    sourcemap: true
  },
});