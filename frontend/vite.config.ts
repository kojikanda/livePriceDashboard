import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // '/frankfurter' へのリクエストを外部APIに転送する
      "/frankfurter": {
        target: "https://api.frankfurter.app",
        changeOrigin: true, // Hostヘッダーをtargetに合わせる（CORS回避に必要）
        rewrite: (path) => path.replace(/^\/frankfurter/, ""), // パスの '/frankfurter' を除去
      },
    },
  },
});
