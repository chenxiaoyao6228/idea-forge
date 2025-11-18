import path from "path";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig, PluginOption, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { inspectorServer } from "@react-dev-inspector/vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import timeReporter from "vite-plugin-time-reporter";
import checker from 'vite-plugin-checker';

export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const isDev = mode === "development";
  const vitePort = parseInt(env.VITE_PORT);

  console.log('isDev', isDev)

  return defineConfig({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@api': path.resolve(__dirname, '../api/src'),
      },
    },
    optimizeDeps: {
      // Exclude workspace packages from pre-bundling to enable HMR
      exclude: ['@idea/contracts', '@idea/file-transfer', '@idea/editor', '@idea/icons'],
    },
    plugins: [
      isDev && checker({
        typescript: {
          tsconfigPath: './tsconfig.json',
          buildMode: false,
        },
        overlay: {
          initialIsOpen: false,
        },
      }),
      isDev ? inspectorServer() : null,
      !isDev && timeReporter(),
      react(),
      tsconfigPaths(),
      // sentryVitePlugin({
    //   org: "yorkchan6228",
    //   project: "idea-forge-client",
    //   authToken: process.env.SENTRY_AUTH_TOKEN,
    // })
    ].filter(Boolean) as PluginOption[],

    server: {
      port: vitePort,
      origin: `http://localhost:${vitePort}`,
      watch: {
        // Enable watching workspace packages by not ignoring node_modules/@idea
        ignored: ['!**/node_modules/@idea/**'],
        // Use polling for better cross-platform compatibility (optional)
        usePolling: false,
      },
      fs: {
        // Allow serving files from workspace packages (monorepo)
        allow: ['../..'],
      },
    },

    build: {
       // generate .vite/manifest.json in outDir
    // set output directory to api/view
      outDir: "../api/view",
      // clear directory before building
      emptyOutDir: true,
      manifest: true,
      sourcemap: true, // Enable source maps for debugging production builds

      rollupOptions: {
        input: "src/index.tsx",
        output: {
          // ensure resource files are placed in the assets directory
          assetFileNames: "assets/[name]-[hash][extname]",
          chunkFileNames: "assets/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
        },
      },
    },
  });
};