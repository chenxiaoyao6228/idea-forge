import { defineConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { inspectorServer } from "@react-dev-inspector/vite-plugin";
import tsconfigPaths from "vite-tsconfig-paths";
import { iconsSpritesheet } from "vite-plugin-icons-spritesheet";
// TODO:  
const port = 5173;
const isDev = process.env.NODE_ENV !== "production";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    isDev ? inspectorServer() : null,
    react(),
    tsconfigPaths(),
    iconsSpritesheet({
      inputDir: "./src/assets/icons",
      typesOutputFile: "./src/components/ui/icons.d.ts",
      outputDir: "../api/public/",
      withTypes: true,
      fileName: "sprite.svg",
    }),
  ],
  server: {
    port: port,
    origin: `http://localhost:${port}`,
  },
  build: {
    // generate .vite/manifest.json in outDir
    outDir: "../api/view", // 设置输出目录
    emptyOutDir: true, // 构建前清空目录
    manifest: true,
    rollupOptions: {
      input: "src/index.tsx", // 指定入口文件
      output: {
        // 确保资源文件放在 assets 目录下
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
});
