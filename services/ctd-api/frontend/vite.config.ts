import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Proxy /api/* requests to backend during development
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  // Build vào backend để chỉ có một domain, một lần deploy (xem PHẦN 1 kiến trúc).
  build: { outDir: "../backend/static", emptyOutDir: true },
});
