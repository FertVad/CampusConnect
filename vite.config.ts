import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // themePlugin(), // Если нужен, раскомментируй и проверь чтобы конфиг был валидный!
    // Если cartographer действительно нужен, подключи его статически:
    // cartographer(),

  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      // Прокидываем API-запросы на бэкенд
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Можно добавить любые другие эндпоинты
    },
  },

});
